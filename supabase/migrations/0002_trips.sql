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

-- NOTE: No RLS policy here — the architecture defines RLS only on `receipts`,
-- and Epic 3 enforces trip ownership at the application query layer
-- (user_id = auth.uid()). Tightening `trips` with RLS is a future security task.
