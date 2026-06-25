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

-- Enforce that even_split_among is a JSON array of strings (the ledger/UI treat
-- it as a participant-name array). A CHECK can't contain a subquery, so the
-- per-element validation lives in an IMMUTABLE helper the constraint calls.
create or replace function public.is_jsonb_string_array(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select v is not null
    and jsonb_typeof(v) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(v) as e
      where jsonb_typeof(e) <> 'string'
    );
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'receipts_even_split_among_strings'
  ) then
    alter table public.receipts
      add constraint receipts_even_split_among_strings
      check (public.is_jsonb_string_array(even_split_among));
  end if;
end $$;
