# Story 15.2: Profiles Table & Display Name

Status: done

## Story

As a user,
I want a display name,
so that I'm identified by something friendlier than my email address.

## Acceptance Criteria

1. A `public.profiles` table exists, 1:1 with `auth.users` (`user_id` primary key referencing `auth.users(id)`), including at least `display_name`.
2. A profile row is auto-created for every user — a trigger creates one on new `auth.users` insert, and existing users are backfilled.
3. RLS allows a user to read and update **only their own** profile (the table is designed so a co-member read policy could be added later without rework).
4. The `/account` page lets the user view and edit their display name, and the change persists.
5. The display name is shown where the user sees their own identity (e.g., the account menu); when unset/blank it falls back to the email.
6. Display names are validated (trimmed, sane max length, blank → fallback) — no broken or empty-string identities.

## Tasks / Subtasks

- [ ] **Migration `0012_profiles.sql`** (AC: 1, 2, 3)
  - [ ] `create table public.profiles (user_id uuid primary key references auth.users(id) on delete cascade, display_name text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));`
  - [ ] `updated_at` maintenance trigger (reuse the `set_*_updated_at()` pattern from `0001_allowed_users.sql`).
  - [ ] **Auto-create trigger:** `handle_new_user()` `SECURITY DEFINER` on `auth.users` AFTER INSERT → `insert into public.profiles(user_id) values (new.id) on conflict do nothing;`
  - [ ] **Backfill:** `insert into public.profiles(user_id) select id from auth.users on conflict do nothing;`
  - [ ] **RLS:** enable; `select using (auth.uid() = user_id)`, `update using (auth.uid() = user_id) with check (auth.uid() = user_id)`, `insert with check (auth.uid() = user_id)`. (Self-only; a future co-member `select` policy can be added without restructuring.)
  - [ ] ⚠️ Coordinate the migration number (`0012`) with any parallel session before claiming it.
- [ ] **Account page — display name** (AC: 4, 6) — on `/account`, read the user's profile, render an editable display-name field, persist via `supabase.from('profiles').update(...)`. Trim, enforce a max length (e.g. 60), reject/normalize blank.
- [ ] **Surface the name** (AC: 5) — show `display_name || user.email` in the account menu (15.1) and wherever the user's own identity renders.
- [ ] **Manual Supabase apply** of `0012`.
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **Foundational data story** — 15.3 (avatar) and 15.4 (preferences) add columns to this same `profiles` table. [Source: docs/docs/prd/epic-15/epic_15_overview.md#target-architecture-blueprint]
- **Trigger must be `SECURITY DEFINER`** — it writes a `public.profiles` row in response to an `auth.users` insert (the inserting context isn't the new user's session). Mirror the existing trigger style in `0001_allowed_users.sql`. [Source: supabase/migrations/0001_allowed_users.sql]
- **Email is not duplicated into `profiles`** — it lives on `auth.users`; the client falls back to `user.email` when `display_name` is blank. Avoids a second copy to keep in sync.
- **No `profiles` table exists today** — Epic 9 preferences are `localStorage`-only; this is the first per-user DB row beyond `allowed_users`. [Source: context/AccentColorContext.tsx]
- **Self-only RLS by design** — co-member name visibility is explicitly out of scope for this epic but the schema permits adding it later. [Source: docs/docs/prd/epic-15/epic_15_overview.md#out-of-scope-candidate-follow-ons]

### Project Structure Notes

- Add `supabase/migrations/0012_profiles.sql`; extend `app/account/page.tsx` (15.1 shell). A small `utils/db/profile.ts` read/update helper is recommended for reuse by 15.3/15.4.

### References

- [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-152-profiles-table--display-name]
- [Source: supabase/migrations/0001_allowed_users.sql]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Migration `0012_profiles.sql`: `profiles` (user_id PK→auth.users, display_name, created/updated_at), `updated_at` trigger (mirrors `0001`), `handle_new_user()` SECURITY DEFINER AFTER INSERT on `auth.users` + one-time backfill, and self-only RLS (select/insert/update where `auth.uid() = user_id`). **Manual Supabase apply.**
- `utils/db/profile.ts`: `fetchProfile()` (fail-safe null) + `updateDisplayName()` (trim, cap at `DISPLAY_NAME_MAX=60`, blank→null; **upsert** so a missing row is created). Reusable by 15.3/15.4. +6 unit tests.
- `/account`: display-name editor (loads profile, save with saved/error feedback). Email is the placeholder + the blank fallback (email is not duplicated into `profiles`).
- `AccountMenu` now shows `display_name || email` (AC5).
- `npm run lint` + `npm run build` + `npm test` clean (64 tests).

### File List

**Added:**
- `supabase/migrations/0012_profiles.sql`
- `utils/db/profile.ts`
- `tests/integration/db/profile.test.ts`

**Modified:**
- `app/account/page.tsx`
- `components/feature/AccountMenu.tsx`
