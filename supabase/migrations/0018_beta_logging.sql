-- Migration: beta logging (Epic 23, Story 23.1)
-- Two first-party sinks for beta observability:
--   * feedback_reports — user-submitted "Report an error" / "Suggest a feature"
--   * error_logs       — automatic client + server error capture
-- Admin review happens via the Supabase dashboard / service role (no admin UI
-- this epic), same pattern as access_requests (0011). Apply in the Supabase SQL
-- editor. Idempotent.

-- ---------------------------------------------------------------------------
-- feedback_reports: user-submitted reports (error report or feature request)
-- ---------------------------------------------------------------------------
create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'error_report',   -- error_report | feature_request
  message text not null,
  path text,                                    -- route the user was on
  context jsonb not null default '{}'::jsonb,   -- e.g. { receipt_id, trip_id }
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.feedback_reports enable row level security;

-- A user may submit their OWN report; only its author identity is constrained
-- (kind/message are free-form). No SELECT policy: review is admin-only via the
-- dashboard / service role.
drop policy if exists "Users insert their own feedback" on public.feedback_reports;
create policy "Users insert their own feedback" on public.feedback_reports
  for insert to authenticated
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- error_logs: automatic client + server error capture
-- ---------------------------------------------------------------------------
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,  -- null: pre-login / server
  source text not null,                         -- client | server
  message text not null,
  stack text,
  path text,
  context jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.error_logs enable row level security;

-- Errors happen before login and in server contexts (no session), so allow
-- inserts from anon + authenticated. The WITH CHECK still prevents attributing
-- an error to another user: user_id must be null or the caller's own id. No
-- SELECT policy (admin reads via the dashboard / service role). Deliberate beta
-- tradeoff: an insert-only, unreadable, PII-light table — minor spam risk at
-- beta scale in exchange for capturing pre-login and server errors.
drop policy if exists "Anyone may insert an error log" on public.error_logs;
create policy "Anyone may insert an error log" on public.error_logs
  for insert to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);
