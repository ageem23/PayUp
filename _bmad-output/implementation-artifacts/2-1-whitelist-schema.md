---
baseline_commit: 023bdc23749c646984096f6bfc03aa1eba293b26
---

# Story 2.1: Database Whitelist Schema Enlistment, Constraints & Indexing

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system administrator,
I want the `allowed_users` whitelist table defined as a tracked, repeatable PostgreSQL migration (table + unique email + index + updated_at trigger),
so that the database layer has a version-controlled, high-performance schema for matching approved emails during authentication.

## Acceptance Criteria

1. The `allowed_users` DDL applies cleanly in the Supabase SQL editor with no constraint collisions, and is **re-runnable** (idempotent) without error.
2. `email` carries a `UNIQUE` constraint (`allowed_users_email_key`), preventing duplicate whitelist rows.
3. A `btree` index named `idx_allowed_users_email` targets the `email` column for fast auth lookups.
4. A trigger `trigger_allowed_users_updated_at` updates `updated_at` to the current UTC time on every row update.

## Tasks / Subtasks

- [x] **Establish the migrations location** (AC: #1) — Create `supabase/migrations/` and add `supabase/migrations/0001_allowed_users.sql`. This is the first DB story, so it sets the project convention: schema changes live as ordered, committed SQL migration files (reviewable in PRs, applied to Supabase by an admin).
- [x] **Write the table DDL** (AC: #1, #2) — Match the authoritative schema in `docs/04_System_Architecture_Master_v3.md` exactly (column names/types/constraints), including the `allowed_users_email_key UNIQUE (email)` and the `created_by → auth.users(id)` FK. Use `create table if not exists` so re-running is safe.
- [x] **Add the email index** (AC: #3) — `create index if not exists idx_allowed_users_email on public.allowed_users using btree (email);`
- [x] **Add the updated_at trigger** (AC: #4) — A `before update` trigger calling a trigger function that sets `new.updated_at = timezone('utc', now())`. Use `create or replace function` and `drop trigger if exists` before `create trigger` so the migration is idempotent.
- [x] **Verify** — Confirm the SQL is syntactically valid and matches the architecture schema. Run `npm run lint` + `npm run build` to confirm the app still builds (adding a `.sql` file must not affect the Next.js build). Note the manual deploy step (below) in the Dev Agent Record.

## Dev Notes

### 🚨 Scope & verification reality (read first)
- **This story's deliverable is the committed migration SQL**, not a live DB mutation. There is no Supabase CLI or migration runner configured in this repo, and applying DDL requires Supabase dashboard / service-role access that CI and this environment do not have.
- **AC#1 ("applies cleanly in the SQL editor") is a deploy-time check performed by the admin** against the actual Supabase project. The dev agent cannot execute it here. Implementation = produce correct, idempotent SQL that matches the architecture; record clearly that applying it to Supabase is a manual admin step.
- **"Tested" for this repo = `npm run lint` + `npm run build` clean** (no test framework, no SQL test harness). A new `.sql` file is outside the Next build graph, so the build stays green; run both to prove no regression.

### Schema source of truth (match exactly)
From `docs/04_System_Architecture_Master_v3.md`, the `allowed_users` table is:
```sql
create table public.allowed_users (
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
```
Do not drift from these names — later stories (2.2 enforcement, RLS) and other tables depend on them. The source story file (`story_02_1_whitelist_schema.md`) truncates before the index/trigger DDL; author those from ACs #3/#4 (below), keeping the architecture table definition verbatim.

### Idempotency (AC#1 "no collisions", re-runnable)
- `create table if not exists` — avoids "relation already exists" on re-run.
- `create index if not exists idx_allowed_users_email …`.
- Trigger function: `create or replace function …`.
- Trigger: `drop trigger if exists trigger_allowed_users_updated_at on public.allowed_users;` then `create trigger …`. (Postgres has no `create trigger if not exists`, so drop-then-create is the idempotent pattern.)

### Trigger implementation
```sql
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
```
- `gen_random_uuid()` and the `auth.users` table are provided by Supabase by default — no extension/setup needed.

### Architecture / cross-story notes
- This table is the gatekeeping matrix for Epic 2. **Story 2.2** adds the auth integration + enforcement hook that reads this table; **Story 2.3** adds login/unauthorized UI. Get the schema names right here so 2.2 doesn't have to correct them. [Source: docs/docs/prd/epic-2/epic_02_overview.md]
- RLS policies for `allowed_users` are NOT in this story's ACs (the architecture doc only shows RLS on `receipts`). Do not add RLS here unless a later story requires it; keep scope to table+constraint+index+trigger. [Source: docs/04_System_Architecture_Master_v3.md]
- No app/TypeScript code changes in this story — purely the migration file. The Supabase client from Story 1.3 is unaffected.

### Project Structure Notes
- New: `supabase/migrations/0001_allowed_users.sql` (+ the `supabase/migrations/` dir).
- `supabase/` is NOT gitignored — the migration is committed and reviewable.
- No `.env`/secret involvement; do not touch `.env.local`.

### References
- [Source: docs/docs/prd/epic-2/story_02_1_whitelist_schema.md] — story, ACs, partial DDL (truncated before index/trigger)
- [Source: docs/docs/prd/epic-2/epic_02_overview.md] — Epic 2 gatekeeping goal; 2.1→2.2→2.3 sequence
- [Source: docs/04_System_Architecture_Master_v3.md] — authoritative `allowed_users` table definition
- [Source: _bmad-output/implementation-artifacts/1-3-supabase.md] — prior story; "tested = lint+build", no migration tooling yet

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-ship-story pipeline

### Debug Log References

- `npm run lint` → `✔ No ESLint warnings or errors`.
- `npm run build` → `✓ Compiled successfully`; route table unchanged (the `.sql` file is outside the Next build graph).
- DDL not executed against a live DB from this environment (no Supabase CLI / service-role access here) — see deploy note below.

### Completion Notes List

- **Deliverable:** `supabase/migrations/0001_allowed_users.sql` — establishes the project's migration convention (`supabase/migrations/`, ordered, committed, reviewable).
- **AC#2:** `email` UNIQUE via `allowed_users_email_key` (in the table DDL, matching architecture).
- **AC#3:** `idx_allowed_users_email` btree index on `email` (`create index if not exists`).
- **AC#4:** `trigger_allowed_users_updated_at` (`before update`, row-level) → `set_allowed_users_updated_at()` sets `updated_at = timezone('utc', now())`.
- **AC#1 idempotency:** `create table if not exists`, `create index if not exists`, `create or replace function`, `drop trigger if exists` + `create trigger` — re-runnable in the SQL editor with no collisions.
- **Schema fidelity:** table definition copied verbatim from `docs/04_System_Architecture_Master_v3.md` (column names/types, PK, unique, `created_by → auth.users` FK). The source story file truncated before the index/trigger; those were authored from ACs #3/#4.
- **Scope held:** no RLS (not in ACs / architecture for this table yet), no app/TS code, no `.env` changes.
- **⚠️ Manual deploy step (AC#1 deploy-time check):** an admin must run this migration in the Supabase SQL editor (or via Supabase CLI) against the project. This environment cannot apply DDL to the live DB; "applies cleanly" is verified by the admin at deploy time. The migration is written to apply and re-apply without error.

### File List

**Added:**
- `supabase/migrations/0001_allowed_users.sql`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Added idempotent `allowed_users` migration (table + unique email + btree index + updated_at trigger). Lint/build clean. Status → review. | Amelia (Dev) |
