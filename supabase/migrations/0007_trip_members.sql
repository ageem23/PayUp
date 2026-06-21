-- Migration: trip membership + invite redemption (Epic 11, Story 11.2 + 11.3)
-- Adds the trip_members collaboration table, a redemption RPC, and extends the
-- trips/receipts RLS so approved members get full editing rights (the clause the
-- 0004 receipts policy anticipated). Apply in the Supabase SQL editor. Idempotent.

create extension if not exists "uuid-ossp" with schema extensions;

create table if not exists public.trip_members (
  id uuid not null default extensions.uuid_generate_v4(),
  trip_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint trip_members_pkey primary key (id),
  constraint trip_members_trip_user_key unique (trip_id, user_id),
  constraint trip_members_trip_id_fkey foreign key (trip_id) references public.trips (id) on delete cascade,
  constraint trip_members_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

create index if not exists idx_trip_members_user_id on public.trip_members (user_id);
create index if not exists idx_trip_members_trip_id on public.trip_members (trip_id);

alter table public.trip_members enable row level security;

-- A user may read their OWN membership rows. Inserts happen only via the
-- SECURITY DEFINER redeem RPC below — there is deliberately no INSERT policy,
-- so members can't be added by a direct client write.
drop policy if exists "Users read their own memberships" on public.trip_members;
create policy "Users read their own memberships" on public.trip_members
  for select using (auth.uid() = user_id);

-- Membership test used by the trips/receipts policies. SECURITY DEFINER so it
-- bypasses RLS internally — avoids policy recursion (trips → trip_members → …).
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

revoke execute on function public.is_trip_member(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;

-- Feature 11.3: members get READ on the trip so they can open it. They do NOT
-- get UPDATE on the trips row: RLS can't restrict columns, so a member UPDATE
-- grant would let a member overwrite user_id (hijack ownership) or invite_token
-- (bypassing the owner-only token RPCs). Member editing happens on `receipts`
-- (below); trip metadata + ownership stay owner-only.
drop policy if exists "Members can read trips" on public.trips;
create policy "Members can read trips" on public.trips
  for select using (public.is_trip_member(id));

-- (Intentionally no member UPDATE/DELETE policy on trips — owner-only.)
drop policy if exists "Members can update trips" on public.trips;

-- Members get full receipt management for trips they belong to (OR'd with the
-- existing owner "for all" policy from 0004).
drop policy if exists "Members can manage receipts" on public.receipts;
create policy "Members can manage receipts" on public.receipts
  for all
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- Redeem an invite link: validate the token, add the caller as a member, return
-- the trip id. Disabled links (invite_token = null) never match a uuid token.
create or replace function public.redeem_invite_token(token_input uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_trip_id uuid;
  trip_owner_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id, user_id into target_trip_id, trip_owner_id
  from public.trips
  where invite_token = token_input;

  if target_trip_id is null then
    raise exception 'Invalid invite token';
  end if;

  -- The owner already has full access; don't pollute trip_members with a
  -- self-membership row. Just hand back the trip id so the UI routes there.
  if trip_owner_id = current_user_id then
    return target_trip_id;
  end if;

  insert into public.trip_members (trip_id, user_id)
  values (target_trip_id, current_user_id)
  on conflict (trip_id, user_id) do nothing;

  return target_trip_id;
end;
$$;

revoke execute on function public.redeem_invite_token(uuid) from public;
grant execute on function public.redeem_invite_token(uuid) to authenticated;
