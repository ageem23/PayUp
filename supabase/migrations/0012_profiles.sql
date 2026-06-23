-- Migration: user profiles (Epic 15, Story 15.2)
-- The first per-user DB row beyond allowed_users: a profile 1:1 with auth.users
-- holding the display name (and, in later stories, avatar + preferences). A row
-- is auto-created for every new user via a trigger on auth.users, plus a
-- one-time backfill. RLS is self-only — a future co-member read policy can be
-- added without restructuring. Apply in the Supabase SQL editor. Idempotent.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Auto-maintain updated_at (mirrors set_allowed_users_updated_at in 0001).
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trigger_profiles_updated_at on public.profiles;
create trigger trigger_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- Auto-create a profile row for every new user. SECURITY DEFINER because the
-- inserting context (auth signup) is not the new user's own session; empty
-- search_path + schema-qualified refs keep it injection-safe.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trigger_on_auth_user_created on auth.users;
create trigger trigger_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One-time backfill for users that predate this table.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;

-- Self-only access. A future co-member SELECT policy can be added alongside
-- these without restructuring the table.
drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own profile" on public.profiles;
create policy "Users insert their own profile" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
