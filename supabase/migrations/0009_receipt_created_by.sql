-- Migration: receipt authorship attribution (Epic 14, Story 14.1)
-- Adds `receipts.created_by` so receipts can be counted per user — the
-- prerequisite for the free-tier receipt quota (Story 14.2). The column default
-- `auth.uid()` self-populates new inserts immediately; Story 14.2's BEFORE
-- INSERT trigger later force-stamps it authoritatively (anti-spoof). Apply in
-- the Supabase SQL editor. Idempotent.

alter table public.receipts
  add column if not exists created_by uuid references auth.users (id);

-- Self-populate new rows now, before the 14.2 trigger exists. The trigger will
-- override any client-supplied value for anti-spoof; keeping this default is
-- intentional belt-and-suspenders so attribution never depends on the trigger.
alter table public.receipts
  alter column created_by set default auth.uid();

-- Best-effort backfill: attribute historical receipts to the parent trip's
-- owner. Rows with no resolvable owner stay null (acceptable — the quota only
-- meters future free-tier inserts, which are always stamped).
update public.receipts r
  set created_by = t.user_id
  from public.trips t
  where r.trip_id = t.id
    and r.created_by is null;

-- Note: created_by is intentionally NOT enforced via an RLS `with check`. The
-- receipts access policy is FOR ALL, so a `created_by = auth.uid()` check would
-- also fire on UPDATE and break Epic 13.6 collaborative editing (a member
-- editing a receipt they didn't create). Authorship is stamped by the 14.2
-- trigger instead. (See epic_14_architecture.md §4.)
