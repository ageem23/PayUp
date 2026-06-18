-- Migration: receipts table (Epic 4, Story 4.2)
-- A receipt belongs to a trip; staged with amount 0 and empty split_among,
-- filled in by later epics. Apply in the Supabase SQL editor. Idempotent.
-- Matches docs/04_System_Architecture_Master_v3.md.

create extension if not exists "uuid-ossp" with schema extensions;

create table if not exists public.receipts (
  id uuid not null default extensions.uuid_generate_v4(),
  trip_id uuid null,
  name character varying(255) not null,
  amount numeric(10, 2) null default 0,
  paid_by character varying(255) not null,
  split_among jsonb null default '[]'::jsonb,
  image_url text null,
  created_at timestamp with time zone null default now(),
  processed_data jsonb null,
  constraint receipts_pkey primary key (id),
  constraint receipts_trip_id_fkey foreign key (trip_id) references public.trips (id) on delete cascade
);

create index if not exists idx_receipts_trip_id
  on public.receipts using btree (trip_id);

-- RLS (NFR2): a receipt is managed by the owner of its parent trip.
-- Epic 11 extends this with a trip_members collaboration clause (that table
-- doesn't exist yet), per the architecture's receipts policy.
alter table public.receipts enable row level security;

drop policy if exists "Owners can manage receipts" on public.receipts;
create policy "Owners can manage receipts" on public.receipts
  for all
  using (auth.uid() = (select user_id from public.trips where id = trip_id))
  with check (auth.uid() = (select user_id from public.trips where id = trip_id));
