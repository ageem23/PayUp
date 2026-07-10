# Story 23.5: Automatic server-side error logging

Status: done

## Story

As a developer supporting beta,
I want server/API errors recorded automatically,
so that backend failures are visible without a client report.

## Acceptance Criteria

1. `instrumentation.ts` implements `onRequestError` (Next 16) → `logError({ source: 'server' })` with the route/path and error detail.
2. Gemini/scan failures in `app/api/ocr/route.ts` are logged to `error_logs` with route + context, in addition to the existing `console.error` and the current clean 4xx/5xx responses (no stack leaked).
3. Server logging is best-effort (never changes the HTTP response) and attaches `user_id` when the request is authenticated.
4. Existing OCR behavior and status codes unchanged (OCR tests still pass).
5. `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Add root `instrumentation.ts` exporting `onRequestError` → `logError({ source: 'server' })` with path + method + route context (AC: 1, 3).
- [x] Add best-effort `logError` calls at the OCR route's two failure points (generateContent, parse) with `receiptId` + stage context (AC: 2).
- [x] Confirm OCR responses/status codes unchanged; OCR tests pass (AC: 4).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- Next 16 makes `instrumentation.ts`/`onRequestError` stable (no experimental flag), giving global server error capture. It runs without a user session, so `error_logs`' null-`user_id` insert path applies. [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-235]
- **Wrapper vs. direct calls:** the OCR route already catches its own errors and returns clean 502s (it doesn't throw), so a generic `withErrorLogging` wrapper would never see them. Direct `logError` calls in the existing catch blocks capture the scan-failure signal that matters; `onRequestError` covers genuinely-unhandled server errors elsewhere. Chosen over a no-op wrapper.
- `logError` is fully self-contained/best-effort, so it swallows cleanly under the OCR test's minimal Supabase mock — no test changes needed.

### Project Structure Notes

- Added: `instrumentation.ts`. Modified: `app/api/ocr/route.ts`.

### References

- [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-235-automatic-server-side-error-logging]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- `instrumentation.ts`: `onRequestError(error, request, context)` → `logError({ source: 'server', message, stack, path, context: { method, routePath, routeType } })`.
- `app/api/ocr/route.ts`: added `logError` after each `console.error` (generateContent failure, JSON parse failure) with `{ receiptId, stage }`; responses/status codes unchanged. OCR suite still 15/15.

### File List

**Added:**
- `instrumentation.ts`

**Modified:**
- `app/api/ocr/route.ts`
