# Epic 14 — Architecture Decision Record: Open Access & the Metered Free Tier

**Status:** Proposed · **Date:** 2026-06-21 · **Author:** John (PM, facilitating architecture) · **Driver:** [epic_14_overview.md](epic_14_overview.md)

This is an **epic-scoped** decision record, not a full system rewrite. It defines exactly how the Epic 14 free-tier quota and access changes are enforced, consistent with the master architecture ([04_System_Architecture_Master_v3.md](../../../04_System_Architecture_Master_v3.md)) and the existing `is_trip_member()` / RLS idioms.

---

## 1. Context & Governing Constraints

- **Whitelist is currently the auth gate.** `context/AuthContext.tsx` signs out any session whose email isn't in `allowed_users`. Epic 14 flips this to a **tier**: anyone may authenticate; `allowed_users` membership means *unlimited*.
- **The quota is a security/cost boundary, not a UX hint.** It MUST be enforced server-side in Postgres; UI affordances are convenience only.
- **`allowed_users` is keyed by email**, with no `auth.users` linkage. Tier resolution must go through the caller's email (`auth.email()`), normalized to match the app's `isWhitelisted()` (which trims + lowercases).
- **`receipts` has no `created_by` today** — there is no way to attribute or count receipts per user until we add it.
- **Known repo↔DB drift:** the deployed `allowed_users` carries a manual public-read RLS policy absent from repo migrations. All tier logic therefore runs through a `SECURITY DEFINER` helper so enforcement never depends on the caller's read access to `allowed_users`.
- **Concurrency requirement (14.2 AC5):** two simultaneous inserts must not both slip past a 3-receipt cap.
- **Parallel work:** another session is building Epic 13 (which adds receipt delete/edit and possibly migrations). Migration numbering and the `receipts` write path are shared surface — see §8.

---

## 2. Decision Summary

| # | Decision | Mechanism |
|---|----------|-----------|
| D1 | Tier resolution | `public.is_unlimited_user()` — `SECURITY DEFINER`, email-normalized, hardened `search_path` |
| D2 | Receipt attribution | `receipts.created_by uuid` (FK → `auth.users`), **trigger-stamped** to `auth.uid()` |
| D3 | Weekly quota enforcement | `BEFORE INSERT` trigger on `receipts` + per-user `pg_advisory_xact_lock`, raising a distinguishable error |
| ~~D4~~ | ~~Trip-creation block~~ | **❌ Superseded 2026-06-21** — free-tier users may create trips; the receipt cap is the only limit (see §6) |
| D5 | Gate removal | App-layer only (`AuthContext` + OAuth callback); no DB change |
| D6 | Quota read for UI | `public.receipt_quota_status()` — returns used / remaining / limit / `next_available_at` |
| D7 | Access requests | `public.access_requests` table + RLS (user writes own, admin reads all) |

> Decision IDs (D1–D7) and section anchors are kept stable for traceability; D4 is retained as a superseded record rather than renumbered.

---

## 3. D1 — Tier Resolution: `is_unlimited_user()`

A single source of truth for "is this user unlimited," mirroring `is_trip_member()`.

```sql
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
```

**Rationale**
- `SECURITY DEFINER` + `set search_path = ''` → ignores the `allowed_users` RLS drift and is injection-safe; all object refs are schema-qualified.
- `lower()` on **both** sides matches `isWhitelisted()`'s trim/lowercase behavior and tolerates non-normalized stored emails. (Trailing/leading whitespace in stored emails is not expected; if it becomes a concern, normalize on write rather than `btrim()` here.)
- `stable` (not `volatile`) so the planner can reuse it within a statement.
- Add a functional index to keep the lookup cheap: `create index if not exists idx_allowed_users_email_lower on public.allowed_users (lower(email));`

---

## 4. D2 — Receipt Attribution: `created_by`

```sql
alter table public.receipts
  add column created_by uuid references auth.users(id);

-- best-effort backfill: attribute historical receipts to the trip owner
update public.receipts r
  set created_by = t.user_id
  from public.trips t
  where r.trip_id = t.id
    and r.created_by is null;
```

**Anti-spoof: the trigger stamps `created_by`, RLS does not.**
A naive `with check (created_by = auth.uid())` was rejected because the `receipts` access policy is `FOR ALL` — that check would also fire on UPDATE and **break Epic 13.6 collaborative editing** (a member editing a receipt they didn't create would have `created_by <> auth.uid()`). Instead, the `BEFORE INSERT` trigger (§5) **force-assigns** `new.created_by := auth.uid()` unconditionally, so:
- the client never needs to send `created_by` (no change required to the staging insert);
- a malicious client cannot forge another user's id to dodge the count;
- UPDATEs are untouched — edits never change authorship and never consume quota.

`created_by` stays **nullable** to tolerate backfilled rows with no resolvable owner; this is acceptable because the quota only meters *future* free-tier inserts, which are always stamped.

---

## 5. D3 — Weekly Quota Enforcement (the core meter)

`BEFORE INSERT` trigger on `receipts`. It (1) stamps authorship, (2) exempts unlimited users, (3) serializes per-user with an advisory lock, (4) counts the trailing 7 days, (5) raises a distinguishable error at the cap.

```sql
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
  -- (1) authoritative authorship stamp (anti-spoof)
  new.created_by := v_uid;

  -- (2) unlimited users bypass the meter entirely
  if public.is_unlimited_user() then
    return new;
  end if;

  -- (3) serialize this user's concurrent inserts (closes the TOCTOU race, 14.2 AC5)
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  -- (4) rolling 7-day window, this user's own receipts only
  select count(*) into v_count
  from public.receipts
  where created_by = v_uid
    and created_at > now() - interval '7 days';

  -- (5) block at the cap with a machine-matchable error (14.2 AC6 / 14.5 AC2)
  if v_count >= 3 then
    raise exception 'RECEIPT_QUOTA_EXCEEDED'
      using errcode = 'P0001',
            detail  = 'Free-tier limit of 3 receipts per rolling 7 days reached.';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_receipt_quota
  before insert on public.receipts
  for each row execute function public.enforce_receipt_quota();
```

**Rationale & notes**
- **Trigger over RLS-subquery:** gives a *distinguishable* error (the RLS path returns a generic "violates row-level security policy," indistinguishable from a real permission denial — fatal for 14.5's friendly limit message) and lets us close the concurrency race explicitly.
- **`pg_advisory_xact_lock(hashtext(uid))`** is transaction-scoped (auto-released at commit/rollback) and serializes only inserts *by the same user* — no global contention. Without it, two concurrent inserts could both read `count = 1` and both pass.
- **Error contract:** the client (`supabase-js`) receives `error.message = 'RECEIPT_QUOTA_EXCEEDED'` (PostgREST surfaces the raised message + `code`). Story 14.5 maps exactly this string to the limit-reached UI. If a stricter contract is wanted, swap to a custom SQLSTATE in the `P0` class (e.g. `P0Q01`); the message string is sufficient for MVP.
- **Counts only `created_by = v_uid`** across all trips → a free-tier user is not penalized for receipts others add to a shared trip (14.2 AC7).
- The existing `receipts` access RLS still governs *which trip* a user may insert into; this trigger composes on top (stamp + meter).

---

## 6. D4 — Trip-Creation Block for Free-Tier Users ❌ SUPERSEDED (2026-06-21)

**Original decision:** gate `trips` insert behind `is_unlimited_user()` so only unlimited users create trips.

**Superseded by product decision:** non-whitelisted users may create trips **freely**. Trips are cheap; the OCR-bearing resource is the receipt, and the 2-per-rolling-7-days receipt quota (D3) is a sufficient free-tier limit on its own. There is **no change to the `trips` INSERT RLS policy** — it stays `auth.uid() = user_id` as today.

This decision is retained (not deleted) to record the reversal. No migration ships for it; the former `0011_trip_create_unlimited_only.sql` is dropped and `access_requests` takes `0011` (see §10).

---

## 7. D5 — Gate Removal (app layer)

No DB change. In `context/AuthContext.tsx` (`applySession`, `signIn`, `signUp`, `signInWithGoogle`) and `app/auth/callback/page.tsx`, stop treating a whitelist miss as a rejection. **Sequencing is the safety mechanism:** the meter D2→D3 (`0009`+`0010`) must be deployed *before* this change, so the receipt cap is already live the instant non-whitelisted users can hold a session (14.3 AC6). `/unauthorized` is retired/repurposed (14.3 AC5).

---

## 8. D6 — Quota Read for the UI

A read helper so 14.5 can show an honest counter and reset time without re-implementing the window client-side.

```sql
create or replace function public.receipt_quota_status()
returns table (is_unlimited boolean, used int, "limit" int, remaining int, next_available_at timestamptz)
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
    -- when at the cap, the oldest in-window receipt aging out frees the next slot
    case when (select count(*) from mine) >= 3
         then (select min(created_at) from mine) + interval '7 days'
         else null end;
$$;
```

UI fails safe: it MAY pre-check this to avoid a doomed image upload (no bucket orphan, 14.5 AC6), but the §5 trigger remains the source of truth; on any UI/server disagreement the server wins (14.5 AC5).

> **Cap constant:** the limit (`3`) is hardcoded in **two** places — the `enforce_receipt_quota()` trigger (§5) and `receipt_quota_status()` (§8). They MUST stay in sync. Env-driven configurability was considered and dropped: the cap is enforced in a Postgres trigger that cannot read the Next.js `.env`, and a DB-side GUC/config table added more complexity than the single constant is worth. To change the cap, edit both functions in one migration.

---

## 9. D7 — Access Requests (14.5)

```sql
create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending',   -- pending | approved | denied
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

-- one open request per user; re-request allowed after a decision
create unique index uq_access_requests_open
  on public.access_requests (user_id) where status = 'pending';

alter table public.access_requests enable row level security;

create policy "Users insert their own request" on public.access_requests
  for insert with check (auth.uid() = user_id);
create policy "Users read their own request" on public.access_requests
  for select using (auth.uid() = user_id);
-- Admin review is out of scope for MVP: reads happen via the service role /
-- Supabase dashboard. No admin UI in this epic.
```

The partial unique index makes duplicate submissions a graceful no-op/upsert (14.5 AC5); granting access stays an explicit admin action of adding the email to `allowed_users` (14.5 AC4).

---

## 10. Migration Plan

Next free number is **0009** (current head is `0008_realtime_receipts.sql`). ⚠️ **Coordinate with the Epic 13 session** — if their delete/edit work claims `0009`, shift this block up. Proposed grouping:

| Migration | Contents | Story |
|-----------|----------|-------|
| `0009_receipt_created_by.sql` | `created_by` column + backfill | 14.1 |
| `0010_tier_and_quota.sql` | `is_unlimited_user()`, `idx_allowed_users_email_lower`, `enforce_receipt_quota()` + trigger, `receipt_quota_status()` | 14.2 |
| `0011_access_requests.sql` | `access_requests` table + RLS | 14.5 |

14.3 (gate removal) and 14.4 (quota UI) are app-layer — no migration. The former `0011_trip_create_unlimited_only.sql` is dropped (D4 superseded).

---

## 11. Story ↔ Architecture Map

| Story | Backed by |
|-------|-----------|
| 14.1 Attribution | D2 (`0009`) |
| 14.2 Quota enforcement | D1 + D3 + D6 (`0010`) |
| 14.3 Open signup | D5 (app layer; depends on the meter D3 shipping first) |
| 14.4 Quota visibility | D6 + the §5 error contract |
| 14.5 Request access | D7 (`0011`) + UI |
| ~~Trip block~~ | ~~D4~~ — superseded (§6) |

---

## 12. Edge Cases & Risks

- **Unlimited → free transition** (email removed from `allowed_users`): the rolling window self-heals; the user's past receipts simply count until they age out. No special handling.
- **Storage orphan:** a blocked insert after a successful image upload orphans an image in `receipt-images`. Mitigated by the 14.5 pre-check; dedicated reconciliation is out of scope (per epic Out-of-Scope).
- **Clock/window:** all comparisons use `now()` server-side; no client time is trusted.
- **`auth.email()` null** (e.g. exotic auth): `is_unlimited_user()` returns false → user is treated as free-tier (fail-closed, correct default).
- **Advisory-lock key collision:** `hashtext` collisions across different users would only cause rare, brief extra serialization — never a correctness problem (the count is still per `created_by`).
- **Receipt write-path coupling with Epic 13:** Epic 13.3/13.6 edit the same `receipts` flow. The trigger is insert-only and the column is additive, so they compose — but rebase/coordination is required on the shared file and migration numbers.

---

## 13. Security Posture

- The receipt quota is **DB-enforced**, not UI-enforced — bypassing the client cannot bypass it.
- Tier resolution is `SECURITY DEFINER` with empty `search_path` — drift-proof and injection-hardened.
- Authorship is **server-stamped**, not client-asserted — no forging another user's id.
- Concurrency race on the cap is explicitly closed with a per-user advisory lock.

## Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Initial Epic 14 architecture: `is_unlimited_user()` tier helper, `created_by` attribution (trigger-stamped), BEFORE INSERT quota trigger with advisory-lock concurrency control, trip-creation RLS block, app-layer gate removal, quota-status read helper, and access-requests table. | John (PM) |
| 2026-06-21 | 1.1.0 | Superseded D4 (trip-creation block) per product decision — free-tier users may create trips; no `trips` RLS change. Dropped migration `0011_trip_create_unlimited_only.sql`; `access_requests` moves to `0011`. Updated migration plan, story map, sequencing, and security posture. | John (PM) |
| 2026-06-21 | 1.2.0 | Raised the free-tier cap from 2 → 3 receipts per rolling 7 days (trigger + status function). Considered env-configurability and dropped it: a Postgres-trigger-enforced limit can't read the Next.js `.env`; the cap stays a hardcoded constant kept in sync across the two functions. | John (PM) |
