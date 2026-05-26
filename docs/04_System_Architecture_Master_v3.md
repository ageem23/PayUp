# Architecture Document v3.0

This document reflects the application's actual database schema and the plan for implementing real-time collaboration.

## 1. Definitive Database Schema
This is the source-of-truth schema for the application, built in Supabase (Postgres).

### `allowed_users`
```sql
create table public.allowed_users (
  id uuid not null default gen_random_uuid (),
  email text not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  created_by uuid null,
  notes text null,
  constraint allowed_users_pkey primary key (id),
  constraint allowed_users_email_key unique (email),
  constraint allowed_users_created_by_fkey foreign KEY (created_by) references auth.users (id)
);

create table public.trips (
  id uuid not null default extensions.uuid_generate_v4 (),
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
  constraint trips_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
);

create table public.receipts (
  id uuid not null default extensions.uuid_generate_v4 (),
  trip_id uuid null,
  name character varying(255) not null,
  amount numeric(10, 2) null default 0,
  paid_by character varying(255) not null,
  split_among jsonb null default '[]'::jsonb,
  image_url text null,
  created_at timestamp with time zone null default now(),
  processed_data jsonb null,
  constraint receipts_pkey primary key (id),
  constraint receipts_trip_id_fkey foreign KEY (trip_id) references trips (id) on delete CASCADE
);

create table public.trip_members (
  id bigint primary key generated always as identity,
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (trip_id, user_id)
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members and owners can manage receipts" ON receipts
FOR ALL USING (
  (auth.uid() = (SELECT user_id FROM trips WHERE id = trip_id)) OR
  (EXISTS (
    SELECT 1 FROM trip_members 
    WHERE trip_members.trip_id = receipts.trip_id 
    AND trip_members.user_id = auth.uid()
  ))
);