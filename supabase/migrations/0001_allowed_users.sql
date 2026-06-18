-- Migration: allowed_users whitelist table (Epic 2, Story 2.1)
-- Gatekeeping matrix for invitation-only access. Apply in the Supabase SQL editor
-- (or via the Supabase CLI). Written to be idempotent / re-runnable.

-- Table (matches docs/04_System_Architecture_Master_v3.md)
create table if not exists public.allowed_users (
  id uuid not null default gen_random_uuid(),
  email text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  created_by uuid null,
  notes text null,
  constraint allowed_users_pkey primary key (id),
  constraint allowed_users_email_key unique (email),
  constraint allowed_users_created_by_fkey foreign key (created_by) references auth.users (id)
);

-- High-performance lookup index for auth-time email matching
create index if not exists idx_allowed_users_email
  on public.allowed_users using btree (email);

-- Auto-maintain updated_at on every row update
create or replace function public.set_allowed_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trigger_allowed_users_updated_at on public.allowed_users;
create trigger trigger_allowed_users_updated_at
  before update on public.allowed_users
  for each row
  execute function public.set_allowed_users_updated_at();
