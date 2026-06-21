-- Migration: enable Supabase Realtime on receipts (Epic 12, Story 12.1)
-- Lets the splitting view stream live split/fee changes between collaborators.
-- Apply in the Supabase SQL editor. Idempotent.
--
-- Note: the owner-OR-member write RLS this epic's AC2/AC3 call for was already
-- added in Epic 11 (0007: member policies on trips/receipts, all keyed off
-- trips.user_id via is_trip_member). No RLS changes needed here.
--
-- Decision (this epic): anonymous sign-in (the spec's 12.1 AC1 / 12.2 AC1) is
-- intentionally NOT enabled — it would bypass the allowed_users whitelist gate
-- enforced since Epic 2 and reinforced by the Epic 11 invite flow. Realtime is
-- scoped to authenticated, whitelisted members.

-- REPLICA IDENTITY FULL so UPDATE payloads carry the full new row (not just the
-- PK) — the client needs split_among/tax/tip values in the change event.
alter table public.receipts replica identity full;

-- Add receipts to the realtime publication (idempotent: skip if already a member).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'receipts'
  ) then
    alter publication supabase_realtime add table public.receipts;
  end if;
end
$$;
