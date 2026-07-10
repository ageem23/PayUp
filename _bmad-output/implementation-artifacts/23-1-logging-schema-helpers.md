# Story 23.1: Logging schema + write helpers

Status: done

## Story

As a developer building beta observability,
I want the feedback/error tables and a single write path,
so that every other story can record reports and errors consistently and safely.

## Acceptance Criteria

1. Migration `0018_beta_logging.sql` creates `public.feedback_reports` and `public.error_logs`; idempotent; applied manually in Supabase.
2. RLS enabled on both. `feedback_reports`: authenticated `insert` own row (`auth.uid() = user_id`); no `select`. `error_logs`: `insert` for `anon` + `authenticated` with check `user_id is null or auth.uid() = user_id`; no `select`.
3. A typed helper exposes `submitFeedback` and `logError`, reusing the anon `supabase` client, attaching `user_id` when a session exists and `navigator.userAgent` where available.
4. Both helpers are best-effort and never throw.
5. `npm run lint` + `npm run build` + `npm test` clean; helper unit-tested. Manual Supabase apply of `0018`.

## Tasks / Subtasks

- [x] Write `supabase/migrations/0018_beta_logging.sql` (both tables + RLS), following the `access_requests` (0011) pattern (AC: 1, 2).
- [x] Write `utils/logging/log.ts` with `submitFeedback` + `logError`, best-effort/no-throw, session-aware, UA-aware, payload caps (AC: 3, 4).
- [x] Unit-test the helpers (payload shape, no-session feedback rejection, swallow-on-failure, null user_id, message cap) (AC: 5).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **Manual migration:** `0018` must be applied in the Supabase SQL editor before feedback/logging persist end-to-end. CI builds with placeholder envs and does not apply migrations (project convention). [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-231]
- `error_logs` accepts anon inserts (user_id null) so pre-login and server-context errors are captured; RLS still forbids attributing an error to another user. No `select` policy on either table — review via the Supabase dashboard.
- Helpers reuse the anon client (no service-role), consistent with `app/api/ocr/route.ts`.

### Project Structure Notes

- Added: `supabase/migrations/0018_beta_logging.sql`, `utils/logging/log.ts`, `tests/unit/logging.test.ts`.

### References

- [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-231-logging-schema--write-helpers]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- `0018_beta_logging.sql`: `feedback_reports` (authenticated insert-own) + `error_logs` (anon/authenticated insert, null-or-own user_id), both RLS-enabled, no select policy. Idempotent.
- `utils/logging/log.ts`: `submitFeedback({kind,message,path,context})` → `{ok}` (rejects without a session since RLS would); `logError({source,message,stack,path,context})` fire-and-forget. Both read the cached session (no network), attach UA, cap message/stack length, and swallow all failures.
- `tests/unit/logging.test.ts`: 6 tests (mock the anon client) — payload shape, anon-feedback rejection, insert-error → ok:false, thrown-insert swallowed, null user_id, message cap. All pass.

### File List

**Added:**
- `supabase/migrations/0018_beta_logging.sql`
- `utils/logging/log.ts`
- `tests/unit/logging.test.ts`
