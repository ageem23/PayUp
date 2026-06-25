-- Even-Split Mode (Epic 21, Story 21.1).
--
-- A receipt is either 'itemized' (the assignment matrix — today's default) or
-- 'even' (the whole total divided equally among `even_split_among`). The even-mode
-- total reuses the existing `receipts.amount numeric(10,2)` column (no new total
-- column). Apply in the Supabase SQL editor. Idempotent.

alter table public.receipts
  add column if not exists split_mode text not null default 'itemized';

alter table public.receipts
  add column if not exists even_split_among jsonb not null default '[]'::jsonb;

-- Constrain split_mode to the two supported modes (idempotent guard).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'receipts_split_mode_check'
  ) then
    alter table public.receipts
      add constraint receipts_split_mode_check
      check (split_mode in ('itemized', 'even'));
  end if;
end $$;
