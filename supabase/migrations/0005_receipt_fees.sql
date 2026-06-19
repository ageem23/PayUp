-- Migration: receipt fee overrides (Epic 7, Story 7.1)
-- Adds the global tax/tip amounts a trip organizer types in from the printed
-- receipt. These are the base constants the proportional multiplier engine
-- (Story 7.2) scales down to each participant. Apply in the Supabase SQL editor.
-- Idempotent. Matches docs/docs/prd/epic-7/story_07_1_fee_inputs.md.

alter table public.receipts
  add column if not exists tax numeric(10, 2) not null default 0,
  add column if not exists tip numeric(10, 2) not null default 0;

-- Defensive non-negative guards: tax/tip are out-of-pocket amounts, never
-- negative. The UI also clamps, but the DB is the final authority.
alter table public.receipts
  drop constraint if exists receipts_tax_non_negative;
alter table public.receipts
  add constraint receipts_tax_non_negative check (tax >= 0);

alter table public.receipts
  drop constraint if exists receipts_tip_non_negative;
alter table public.receipts
  add constraint receipts_tip_non_negative check (tip >= 0);
