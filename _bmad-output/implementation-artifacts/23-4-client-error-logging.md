# Story 23.4: Automatic client-side error logging

Status: done

## Story

As a developer supporting beta,
I want uncaught client errors recorded automatically,
so that I see crashes testers never bother to report.

## Acceptance Criteria

1. App Router error boundaries exist — `app/global-error.tsx` (root) and `app/error.tsx` (segment) — each renders a friendly fallback and calls `logError({ source: 'client' })` with message + stack + path.
2. A globally-mounted listener records `window` `error` and `unhandledrejection` events via `logError`.
3. Logging is throttled/deduped (repeat of the same message within a short window is dropped) and cannot recurse.
4. Fallback UIs offer recovery (reset) and don't leak stack traces to the user.
5. `npm run lint` + `npm run build` + `npm test` clean; a test covers the dedupe/throttle logic.

## Tasks / Subtasks

- [x] `app/error.tsx` (segment boundary): friendly fallback + `reset` + `logError` (AC: 1, 4).
- [x] `app/global-error.tsx` (root boundary): own `<html>/<body>` with inline styles (no global CSS available), + `logError` + `reset` (AC: 1, 4).
- [x] `components/feature/ErrorListener.tsx`: `window` `error` + `unhandledrejection` → `logError`, mounted in `app/layout.tsx` (AC: 2).
- [x] `utils/logging/throttle.ts`: `createErrorThrottle`/`shouldLogError` dedupe within a 10s window; unit-tested (AC: 3, 5).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- `global-error.tsx` replaces the root layout, so the app stylesheet isn't loaded — inline styles guarantee a readable fallback. [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-234]
- The throttle takes `now` as a parameter so it's deterministically testable; `logError` is best-effort, so a logging failure can't recurse into more logging.

### Project Structure Notes

- Added: `app/error.tsx`, `app/global-error.tsx`, `components/feature/ErrorListener.tsx`, `utils/logging/throttle.ts`, `tests/unit/errorThrottle.test.ts`. Modified: `app/layout.tsx`.

### References

- [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-234-automatic-client-side-error-logging]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- Error boundaries `app/error.tsx` (Tailwind fallback) and `app/global-error.tsx` (inline-styled, own html/body) both log via `logError` and expose `reset`. No stack shown to the user.
- `ErrorListener` (mounted in the layout) wires `window` `error` + `unhandledrejection`, deduped by message via `shouldLogError`.
- `utils/logging/throttle.ts`: `createErrorThrottle(windowMs)` returns `shouldLog(key, now)`; 3 unit tests cover first-hit, repeat-drop, window-elapse, and distinct keys.

### File List

**Added:**
- `app/error.tsx`
- `app/global-error.tsx`
- `components/feature/ErrorListener.tsx`
- `utils/logging/throttle.ts`
- `tests/unit/errorThrottle.test.ts`

**Modified:**
- `app/layout.tsx`
