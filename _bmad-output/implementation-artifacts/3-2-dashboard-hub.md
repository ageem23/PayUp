---
baseline_commit: 916bd7bf5486e8acece4df9fc3493e1a1d005f2f
---

# Story 3.2: Trip Management Workspace Dashboard Hub Layout

Status: done

## Story

As an active platform user,
I want a centralized dashboard showing all my trips and their settlement status,
so that I can access my summaries or start a new group checkout.

## Acceptance Criteria

1. `/dashboard` loads a grid pulling rows from `public.trips`.
2. The query is scoped to the authenticated user (`user_id`).
3. Each card shows trip title, a cleanly formatted creation timestamp, and a settled/active chip (`is_settled`).
4. Clicking a card navigates to `/trips/[id]`.
5. A prominent "+ Create New Trip" button links to `/dashboard/new`.

## Tasks / Subtasks

- [x] **Create `/dashboard`** (AC: #1) — `app/dashboard/page.tsx`, a `"use client"` page.
- [x] **Auth-scoped load** (AC: #2) — `useEffect` fetches `trips` where `user_id === user.id`, newest first; auth-guard redirects to `/` if unauthenticated.
- [x] **Cards** (AC: #3,#4) — grid (`grid-cols-1 md:grid-cols-3 gap-4`); each card shows name, formatted `created_at`, and an `is_settled` chip; the whole card links to `/trips/${trip.id}`.
- [x] **Empty state** — if the user has no trips, show a friendly prompt to create their first.
- [x] **Create button** (AC: #5) — a visible "+ Create New Trip" link to `/dashboard/new`.
- [x] **Verify** — `npm run lint` + `npm run build` clean.

## Dev Notes

### Scope (per story dev notes)
Keep the query filter strictly `user_id === auth.uid()` — **do not** add member/collaboration lookups (that's Epic 11). [Source: docs/docs/prd/epic-3/story_03_2_dashboard_hub.md#Dev Notes]

### Data + types
- `supabase.from("trips").select("id,name,created_at,is_settled").eq("user_id", user.id).order("created_at", { ascending: false })`. The client is untyped, so assert the result to a local `Trip` type (a type assertion, not `any`, to satisfy strict ESLint).
- `created_at` is nullable — guard before `new Date(...).toLocaleDateString()`.
- Same security note as 3.1: ownership is an app-level filter (no RLS on `trips` yet); a malicious client could query others' rows. Future RLS hardening. [Source: 3-1-trip-creation.md]

### Consumes prior work
- `useAuth()` (2.2) + `AuthProvider` in layout (2.3); `supabase` client (1.3). Build env guard already handled (2.3 CI placeholders + local `.env.local`). No `ci.yml` change.
- Strict ESLint: no `any`, no unused; `useRouter`/`Link` from `next/*` (App Router). Watch `react-hooks/exhaustive-deps` on the load effect.

### Forward gaps
- `/trips/[id]` (card target) is built in Epic 4+ — 404 until then. `/dashboard/new` exists (Story 3.1). This story **resolves the post-login `/dashboard` 404** from Story 2.3.

### Project Structure Notes
- New: `app/dashboard/page.tsx`. "Tested" = lint + build clean. Cloud review at the Epic 3 PR.

### References
- [Source: docs/docs/prd/epic-3/story_03_2_dashboard_hub.md] — story, ACs, grid classes, link pattern
- [Source: _bmad-output/implementation-artifacts/3-1-trip-creation.md] — `trips` schema, app-level ownership, `/trips/[id]` gap

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` → clean; `npm run build` → `○ /dashboard` (2.06 kB).

### Completion Notes List

- **AC#1/#2:** `/dashboard` loads trips via `supabase.from("trips").select(...).eq("user_id", user.id).order("created_at", desc)` — user-scoped.
- **AC#3:** cards show name, `created_at` (formatted, null-safe), and a settled/active chip from `is_settled`.
- **AC#4/#5:** each card links to `/trips/${id}`; a visible "+ Create New Trip" links to `/dashboard/new`.
- Empty-state prompt when the user has no trips; loading + error states handled.
- Auth-guarded (redirects to `/` if unauthenticated). **Resolves the post-login `/dashboard` 404** from Story 2.3.
- Strict ESLint clean: `Trip` type assertion (not `any`), `useCallback` load fn with correct effect deps, `&apos;` escaping. Local review clean.
- **Forward gap:** card target `/trips/[id]` is built in Epic 4+ (404 until then). Ownership is app-level (no `trips` RLS yet — future hardening).

### File List

**Added:**
- `app/dashboard/page.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Dashboard hub at `/dashboard` (user-scoped trip grid, settled chip, formatted dates, empty state, create button). Resolves the 2.3 post-login 404. Lint/build clean; local review clean. Merged into `epic-3`. | Amelia (Dev) |
