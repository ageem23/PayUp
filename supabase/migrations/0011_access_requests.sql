-- Migration: access requests (Epic 14, Story 14.5)
-- A free-tier user who hit the receipt cap can request unlimited access. This
-- records the ask; granting stays an explicit admin action (adding the email to
-- allowed_users). Apply in the Supabase SQL editor. Idempotent.

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'pending',   -- pending | approved | denied
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

-- One OPEN request per user → duplicate submissions are a graceful no-op (the
-- client treats the unique violation as "already pending"). A user may
-- re-request after a prior request is approved/denied.
create unique index if not exists uq_access_requests_open
  on public.access_requests (user_id)
  where status = 'pending';

alter table public.access_requests enable row level security;

-- A user may submit and read their OWN requests. Admin review happens via the
-- service role / Supabase dashboard (no admin UI this epic).
drop policy if exists "Users insert their own request" on public.access_requests;
create policy "Users insert their own request" on public.access_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users read their own request" on public.access_requests;
create policy "Users read their own request" on public.access_requests
  for select using (auth.uid() = user_id);
