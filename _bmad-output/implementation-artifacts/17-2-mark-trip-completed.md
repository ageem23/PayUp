# Story 17.2: Mark a Trip Completed + Dashboard Toggle

Status: done

## Story

As a trip owner,
I want to mark a trip completed and keep finished trips out of my active list,
so that my dashboard shows what's still in progress.

## Acceptance Criteria

1. The owner can mark a trip **completed** and un-mark it, persisted via the existing `trips.is_settled` flag.
2. The dashboard **hides completed trips by default**.
3. A toggle on the dashboard reveals completed trips alongside (or in place of) active ones.
4. When shown, completed trips are visually labeled as completed.
5. Only the trip owner can change completion state (existing owner-only `trips` UPDATE RLS); members see the state but don't toggle it.
6. No change to settle-up math — `is_settled` here means "the user marked this trip done."

## Tasks / Subtasks

- [ ] **Mark-complete control** (AC: 1, 5) — on the trip page (and/or the dashboard card), an owner-only control toggles `trips.is_settled` true/false via `supabase.from('trips').update({ is_settled })`. Hide/disable it for non-owners (compare `trip.user_id` to `user.id`); the owner-only `trips` UPDATE RLS is the authority.
- [ ] **Default-hide completed** (AC: 2) — the dashboard's active list filters out `is_settled = true` trips.
- [ ] **"Show completed" toggle** (AC: 3, 4) — a dashboard toggle reveals completed trips; render them with a clear "Completed" label/treatment.
- [ ] **No migration** — `trips.is_settled` already exists (default false). [Source: docs/04_System_Architecture_Master_v3.md#1-definitive-database-schema]
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **Reusing `is_settled` is a deliberate product decision** (no new column). It now doubles as the "completed/archived" flag; there is no separate settle-up state to keep distinct in this app. [Source: docs/docs/prd/epic-17/epic_17_overview.md#target-approach--technical-notes]
- **Owner-only** — `trips` UPDATE RLS is already `auth.uid() = user_id`, so the server enforces owner-only completion; the UI just hides the control for members. [Source: supabase/migrations/0002_trips.sql]
- Pairs well with 17.1 (creator identity) on the same dashboard cards — coordinate the card component changes.

### Project Structure Notes

- Modify `app/dashboard/page.tsx` (filter + toggle) and `app/trips/[id]/page.tsx` (mark-complete control). No migration.

### References

- [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-172-mark-a-trip-completed--dashboard-toggle]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Dashboard: hides `is_settled` trips by default, a **"Show completed"** checkbox reveals them, badge relabeled **"Completed"/"Active"**, and an empty state when all trips are completed but hidden.
- Trip page: owner-only **"Mark completed"/"Mark active"** toggle (+ a "Completed" chip) writing `trips.is_settled` via the owner-only UPDATE RLS; hidden for members.
- No migration (reuses `trips.is_settled`); settle-up math untouched (AC6).
- `npm run lint` + `npm run build` + `npm test` (75) clean.

### File List

**Modified:**
- `app/dashboard/page.tsx`
- `app/trips/[id]/page.tsx`
