# Story 23.6: Extend error-logging coverage to high-value failure points

Status: done

## Story

As a developer supporting beta,
I want explicit logging where errors currently vanish into generic UI,
so that the most damaging blind spots are covered.

## Acceptance Criteria

1. `logError` added at the top-priority points: Supabase data-access failures (trip/dashboard load, profile fetch, matrix patch), auth failures (sign-in / sign-up / OAuth), and image upload failures.
2. Each call includes a useful `context` (operation + relevant ids), best-effort and PII-light; existing user-facing messages/toasts unchanged.
3. Realtime channel errors, invite-redemption, quota/access, and settle-up non-reconciliation are either covered or explicitly logged as deferred (no silent scope drop).
4. No behavior change beyond the added logging; `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Data-access: dashboard trip load (error + throw), `fetchProfile` failure, receipt-split (matrix) save failure (AC: 1, 2).
- [x] Auth: Google OAuth, sign-in, and sign-up failures on the login page (AC: 1, 2).
- [x] Image upload: receipt image (`ReceiptUploadZone`, both failure paths) and avatar (`/account`) (AC: 1, 2).
- [x] Document the deferred areas (AC: 3).
- [x] Confirm no behavior change; tested utils (`profile`, `matrixPatch`) still pass since `logError` is best-effort. `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- Instrumented at **call sites** where possible (components/pages, which have no unit tests) to avoid disturbing the focused db/auth tests; `fetchProfile` swallows to `null` internally, so its log sits in the util (before the `return null`) — verified the profile test still passes since `logError` swallows under its mock. [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-236]
- **Deferred (documented, not silently dropped):** realtime channel errors (Epic 12), invite-link redemption (Epic 11), quota/access errors (Epic 14), and settle-up non-reconciliation. These are lower-frequency or already surface a specific UI state; the automatic client/server hooks (23.4/23.5) still catch any thrown error at these sites. Fold into a later pass if beta traffic shows a blind spot.

### Project Structure Notes

- Modified: `app/dashboard/page.tsx`, `utils/db/profile.ts`, `components/feature/ReceiptSplitView.tsx`, `app/page.tsx`, `components/feature/ReceiptUploadZone.tsx`, `app/account/page.tsx`.

### References

- [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-236-extend-error-logging-coverage-to-high-value-failure-points]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- Data-access: `app/dashboard/page.tsx` (loadTrips fetchError + catch), `utils/db/profile.ts` (`fetchProfile` error), `components/feature/ReceiptSplitView.tsx` (both `patchReceiptSplits` `.catch`es, with `receiptId`).
- Auth: `app/page.tsx` — Google OAuth, sign-in, sign-up failures.
- Upload: `components/feature/ReceiptUploadZone.tsx` (uploadError + thrown), `app/account/page.tsx` (avatar `result.ok === false`).
- All calls are `void logError(...)` in existing error branches with an `operation` context; no user-facing message changed. Profile + matrixPatch tests still green (12/12).

### File List

**Modified:**
- `app/dashboard/page.tsx`
- `utils/db/profile.ts`
- `components/feature/ReceiptSplitView.tsx`
- `app/page.tsx`
- `components/feature/ReceiptUploadZone.tsx`
- `app/account/page.tsx`
