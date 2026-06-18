-- Migration: trips table (Epic 3, Story 3.1)
-- Trip container with a denormalized participants JSONB string array. Apply in
-- the Supabase SQL editor (or via the Supabase CLI). Idempotent / re-runnable.
-- Matches docs/04_System_Architecture_Master_v3.md.

create extension if not exists "uuid-ossp" with schema extensions;

create table if not exists public.trips (
  id uuid not null default extensions.uuid_generate_v4(),
  name character varying(255) not null,
  participants jsonb null default '[]'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_settled boolean null default false,
  user_id uuid null,
  is_public boolean null default false,
  invite_token uuid null,
  constraint trips_pkey primary key (id),
  constraint trips_invite_token_key unique (invite_token),
  constraint trips_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Owner lookup for the dashboard (Story 3.2 filters trips by user_id).
create index if not exists idx_trips_user_id
  on public.trips using btree (user_id);

-- Row Level Security (NFR2 tenant isolation): a trip is owned by its creator.
-- Enforced at the DB layer so the app's user_id filter can't be bypassed via
-- the anon key. Mirrors the ownership model used for `receipts`.
alter table public.trips enable row level security;

drop policy if exists "Owners can read their trips" on public.trips;
create policy "Owners can read their trips" on public.trips
  for select using (auth.uid() = user_id);

drop policy if exists "Owners can insert their trips" on public.trips;
create policy "Owners can insert their trips" on public.trips
  for insert with check (auth.uid() = user_id);

drop policy if exists "Owners can update their trips" on public.trips;
create policy "Owners can update their trips" on public.trips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Owners can delete their trips" on public.trips;
create policy "Owners can delete their trips" on public.trips
  for delete using (auth.uid() = user_id);

-- NOTE: `user_id` is left nullable to match the architecture schema; the INSERT
-- policy above (auth.uid() = user_id) already prevents null/forged owners on
-- client inserts. Public/shared-trip visibility (is_public, invite_token) is
-- added with its own policies in Epic 11.
