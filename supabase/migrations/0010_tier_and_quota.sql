-- Migration: free-tier receipt quota (Epic 14, Story 14.2). Depends on 0009.
-- Converts the whitelist from an auth gate into a usage tier: whitelisted users
-- are unlimited; everyone else may create at most 3 receipts per rolling 7 days,
-- enforced authoritatively in Postgres. Apply in the Supabase SQL editor.
-- Idempotent.
--
-- ⚠️ The free-tier cap (3) is hardcoded in TWO functions below
-- (enforce_receipt_quota and receipt_quota_status). They MUST stay in sync — to
-- change the cap, edit both. (See epic_14_architecture.md §8.)

-- D1 — Tier resolution: single source of truth for "is this user unlimited".
-- SECURITY DEFINER + empty search_path so it ignores the allowed_users public-
-- read RLS drift and is injection-hardened (all refs schema-qualified). Email-
-- normalized (lower) on both sides to match the app's isWhitelisted().
create or replace function public.is_unlimited_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_users a
    where lower(a.email) = lower(auth.email())
  );
$$;

revoke execute on function public.is_unlimited_user() from public;
grant execute on function public.is_unlimited_user() to authenticated;

-- Keep the tier lookup cheap.
create index if not exists idx_allowed_users_email_lower
  on public.allowed_users (lower(email));

-- D3 — Weekly quota enforcement (the core meter). BEFORE INSERT on receipts:
-- (1) stamps authorship authoritatively, (2) exempts unlimited users,
-- (3) serializes per-user inserts with a txn-scoped advisory lock (closes the
-- TOCTOU race), (4) counts the trailing 7 days of the user's own receipts,
-- (5) raises a distinguishable error at the cap.
create or replace function public.enforce_receipt_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  -- (0) reject unauthenticated inserts — no actor to attribute or meter, and an
  -- unstamped row (created_by null) would never count toward anyone's quota.
  -- Fail closed.
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- (1) authoritative stamps (anti-spoof: override any client-supplied values).
  -- created_at is forced to now() so a caller can't backdate a row to slip out
  -- of the rolling 7-day window and evade the cap.
  new.created_by := v_uid;
  new.created_at := now();

  -- (2) unlimited users bypass the meter entirely
  if public.is_unlimited_user() then
    return new;
  end if;

  -- (3) serialize this user's concurrent inserts (14.2 AC5). Txn-scoped, auto-
  -- released at commit/rollback, serializes only same-user inserts.
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  -- (4) rolling 7-day window, this user's own receipts only (AC7)
  select count(*) into v_count
  from public.receipts
  where created_by = v_uid
    and created_at > now() - interval '7 days';

  -- (5) block at the cap with a machine-matchable error (AC2, AC6; 14.4 maps it)
  if v_count >= 3 then
    raise exception 'RECEIPT_QUOTA_EXCEEDED'
      using errcode = 'P0001',
            detail  = 'Free-tier limit of 3 receipts per rolling 7 days reached.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_receipt_quota on public.receipts;
create trigger trg_enforce_receipt_quota
  before insert on public.receipts
  for each row execute function public.enforce_receipt_quota();

-- D6 — Quota read for the UI (Story 14.4): used / limit / remaining /
-- next_available_at, computed server-side so the client never reimplements the
-- window. next_available_at = oldest in-window receipt's created_at + 7 days.
create or replace function public.receipt_quota_status()
returns table (
  is_unlimited boolean,
  used int,
  "limit" int,
  remaining int,
  next_available_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select created_at
    from public.receipts
    where created_by = auth.uid()
      and created_at > now() - interval '7 days'
    order by created_at
  )
  select
    public.is_unlimited_user(),
    (select count(*)::int from mine),
    3,
    greatest(0, 3 - (select count(*)::int from mine)),
    case when (select count(*) from mine) >= 3
         then (select min(created_at) from mine) + interval '7 days'
         else null end;
$$;

revoke execute on function public.receipt_quota_status() from public;
grant execute on function public.receipt_quota_status() to authenticated;
