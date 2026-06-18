---
baseline_commit: 838e9f9478f8f8d160d41f97b7076f44fb877161
---

# Story 3.1: Trip Creation Form & JSONB Participant String Array Serialization

Status: done

## Story

As a trip organizer,
I want a single-screen form to name a trip and add an arbitrary list of attendee names,
so that I can instantly establish a shared billing boundary without multi-step wizards.

## Acceptance Criteria

1. `/dashboard/new` loads an interactive form requiring a Trip Name.
2. A dynamic multi-entry list: typing a name and pressing Enter or clicking "Add" appends it to a visible local list; each entry has a Remove (×) control.
3. Submitting inserts a row into `public.trips` via the Supabase client.
4. Participants serialize to a flat JSONB string array, e.g. `["Alice","Bob","Charlie"]`.
5. The authenticated `user_id` is stamped on the row as owner.

## Tasks / Subtasks

- [x] **Add the `trips` migration** — `supabase/migrations/0002_trips.sql` with the architecture's `public.trips` DDL (idempotent). The table doesn't exist yet (Epic 2 only added `allowed_users`); 3.1 is the first story to touch `trips`, so it owns the migration. Applied in Supabase at deploy (like 2.1).
- [x] **Create the form** (AC: #1,#2) — `app/dashboard/new/page.tsx`, a `"use client"` component: Trip Name input + a participant sub-input with Enter/`Add` handling and removable chips. State: `tripName`, `participantsList: string[]`, `participantInput`, `submitting`, `error`.
- [x] **Auth guard** — uses `useAuth()`; if `!loading && !user`, redirect to `/` (`/dashboard/*` is an authenticated area).
- [x] **Submit** (AC: #3,#4,#5) — insert via the client and route to the new trip:
  ```typescript
  const { data, error } = await supabase
    .from("trips")
    .insert([{ name: tripName, participants: participantsList, user_id: user.id }])
    .select()
    .single();
  ```
  On success → `router.push(`/trips/${data.id}`)`; on error → show inline. `participantsList` (a `string[]`) marshals straight to the `jsonb` column (AC#4).
- [x] **Verify** — `npm run lint` + `npm run build` clean.

## Dev Notes

### `trips` table (source of truth = architecture)
Match `docs/04_System_Architecture_Master_v3.md` exactly: `id` (uuid, `extensions.uuid_generate_v4()`), `name varchar(255) not null`, `participants jsonb default '[]'`, `created_at`/`updated_at`, `is_settled bool default false`, `user_id uuid → auth.users(id) on delete cascade`, `is_public`, `invite_token` (unique). Use `create table if not exists` + `create extension if not exists "uuid-ossp"` for idempotency.

### ⚠️ RLS scope (deliberate, matches architecture + story)
The architecture defines **no RLS policy for `trips`** (only `receipts`), and Story 3.2's dev notes mandate an **application-level** filter (`user_id === auth.uid()`). So this migration adds **no RLS**; ownership is enforced in app queries. ⚠️ Without RLS, the anon/authenticated role can read all trips via PostgREST — a security gap to harden later (RLS policy on `trips`), same status as `allowed_users`. Do not invent RLS beyond the architecture here. [Source: docs/docs/prd/epic-3/story_03_2_dashboard_hub.md#Dev Notes, docs/04_System_Architecture_Master_v3.md]

### Consumes prior work
- `useAuth()` (Story 2.2) gives `{ user, loading }`; `supabase` client from `@/utils/supabase/client` (1.3). `AuthProvider` is mounted in the layout (2.3), so `useAuth()` works app-wide. [Source: 2-2, 2-3]
- Build env guard already handled (CI placeholders from 2.3; local `.env.local`). No `ci.yml` change needed.
- Strict ESLint: no `any`, no unused; `useRouter` from `next/navigation`. The untyped `supabase.from("trips")` returns library-inferred types — don't add `any`.

### Cross-story / forward gaps
- Success redirects to `/trips/[id]`, **not built until Epic 4+** (receipt/matrix UI) — a 404 until then, by design (the route is in the blueprint but no Epic 3 story builds it). Story 3.2 also links cards there. [Source: docs/docs/prd/epic-3/epic_03_overview.md]
- Participant input: trim, ignore empty, and avoid obvious dupes; keep it a flat `string[]` (no objects) per AC#4.

### Project Structure Notes
- New: `supabase/migrations/0002_trips.sql`, `app/dashboard/new/page.tsx`.
- "Tested" = lint + build clean (no test framework). Cloud review happens once, at the Epic 3 PR (per `bmad-implement-epic`).

### References
- [Source: docs/docs/prd/epic-3/story_03_1_trip_creation.md] — story, ACs, insert snippet
- [Source: docs/docs/prd/epic-3/epic_03_overview.md] — `/dashboard/new`, `/trips/[id]`, JSONB participants
- [Source: docs/04_System_Architecture_Master_v3.md] — `trips` table DDL
- [Source: _bmad-output/implementation-artifacts/2-2-whitelist-enforcement.md, 2-3-auth-ui.md] — `useAuth`, AuthProvider, client env guard

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` → clean; `npm run build` → `○ /dashboard/new` (2.17 kB), all routes prerender.

### Completion Notes List

- **AC#1/#2:** `/dashboard/new` form with Trip Name + a participant sub-input (Enter or "Add" appends; dedupe + trim; removable `×` chips; empty-state text).
- **AC#3/#4/#5:** submit inserts `{ name, participants, user_id: user.id }` into `public.trips` via the client; `participants` is a flat `string[]` → `jsonb`; `user_id` stamped from `useAuth()`. On success → `/trips/${id}`.
- **Migration:** `supabase/migrations/0002_trips.sql` (architecture DDL, idempotent, `idx_trips_user_id`). No RLS (matches architecture; app-level ownership filter per Epic 3) — flagged as a future hardening task. **Apply in Supabase at deploy.**
- **Auth guard:** redirects to `/` if unauthenticated; renders a loading state until `useAuth()` resolves.
- Strict ESLint clean (no `any`, no unused). Local review found no issues.
- **Forward gap:** `/trips/[id]` (success redirect) is built in Epic 4+ — 404 until then.

### File List

**Added:**
- `supabase/migrations/0002_trips.sql`
- `app/dashboard/new/page.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Trip creation form at `/dashboard/new` (dynamic participant chips, JSONB serialization, user_id stamping) + `trips` table migration. Lint/build clean; local review clean. Merged into `epic-3`. | Amelia (Dev) |
