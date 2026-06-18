---
baseline_commit: 2ec6aa08b673fcf51d39807358c064d4904cd5a9
---

# Story 5.2: Asynchronous Ingestion Mock Endpoint & Client State Hydration Hook

Status: done

## Story

As a systems developer,
I want a mock injector that seeds structured line items into a receipt shortly after creation,
so that the app behaves as if an OCR scan ran, while real OCR integration is still pending.

## Acceptance Criteria

1. Creating a receipt triggers a routine that simulates a ~2-second background processing delay.
2. On completion, the receipt's `processed_data` is updated with a JSON array of mock line items (id, name, price).
3. The matrix view shows a loading skeleton while `processed_data` is empty/null and auto-refreshes to render the matrix as soon as the mock finishes.

## Tasks / Subtasks

- [x] **Build `MatrixStateWrapper`** (AC: #1,#2,#3) — `components/feature/MatrixStateWrapper.tsx`, a `"use client"` wrapper around the matrix:
  - Given `receiptId` + `initialProcessedData`, if items are empty/null → render a **skeleton** and, **once** (`useRef` guard), fire a `setTimeout(~2000ms)` mock that `supabase.from("receipts").update({ processed_data: mockLines }).eq("id", receiptId)` with mock `{ id: crypto.randomUUID(), name, price }` lines, then set local items so the matrix renders (no manual reload needed).
  - If items already present → render the matrix immediately. `clearTimeout` on unmount.
- [x] **Wire into the matrix page** — `app/trips/[id]/receipts/[receiptId]/page.tsx`: wrap the table in `MatrixStateWrapper` (render-prop `children: (items) => …`), feeding it the fetched `processed_data`.
- [x] **Wire staging → matrix navigation** — so the mock actually kicks off after creation:
  - `ReceiptStagingModal`: change the insert to `.select("id").single()` and call `onCreated(newId)`.
  - Trip Hub (`app/trips/[id]/page.tsx`): `onCreated(receiptId)` → `router.push(\`/trips/${tripId}/receipts/${receiptId}\`)` (replaces the prior "added" counter).
- [x] **Verify** — `npm run lint` + `npm run build` clean.

## Dev Notes

### ⚠️ This is a MOCK (FR2 not satisfied)
The 2s delay + hardcoded line items simulate OCR; **no real extraction happens**. The PRD's FR2 (AI receipt extraction) remains **unbuilt** — the readiness report flagged this, and 5.2 is explicitly the placeholder. A future story must add real OCR (or FR2 is formally descoped). Keep the mock obviously a mock (fixed sample lines). [Source: docs/docs/prd/epic-5/story_05_2_mock_ocr_pipeline.md; readiness report §FR2]

### Implementation choice — client-side timeout
The story allows "client-side timeout hook, server route, or RPC." Use the **client-side `setTimeout`** (simplest, no backend): it runs in the browser after the matrix page mounts with empty `processed_data`. The mock `update` runs under the owner RLS on `receipts` (the logged-in owner can update). Guard with `useRef` so it fires exactly once and only when `processed_data` is empty.
- Set local item state from the mock result rather than re-fetching (the result is known) — that's the "auto-refresh" (AC#3) without an extra round-trip.

### Wiring / consumes prior work
- 5.1 matrix page + `receipts.processed_data` (Epic 5/4); `ReceiptStagingModal` + Trip Hub (Epic 4) — both edited here to return the new receipt id and navigate to the matrix page so the mock triggers. The staging insert already exists; adding `.select("id").single()` returns the id.
- Strict ESLint: no `any`, no unused; `useRef`/`useEffect` cleanup; render-prop children typed as `(items: LineItem[]) => ReactNode`.

### Project Structure Notes
- New: `components/feature/MatrixStateWrapper.tsx`. Modified: `app/trips/[id]/receipts/[receiptId]/page.tsx`, `components/feature/ReceiptStagingModal.tsx`, `app/trips/[id]/page.tsx`. "Tested" = lint + build; cloud review at the Epic 5 PR.

### References
- [Source: docs/docs/prd/epic-5/story_05_2_mock_ocr_pipeline.md] — story, ACs, mock-timeout snippet
- [Source: _bmad-output/implementation-artifacts/5-1-matrix-ui.md] — matrix page + `LineItem`/`processed_data` shape
- [Source: _bmad-output/implementation-artifacts/4-2-receipt-staging.md] — `ReceiptStagingModal` insert this extends

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` clean; `npm run build` clean (`/trips/[id]/receipts/[receiptId]` dynamic).

### Completion Notes List

- **AC#1/#2:** `MatrixStateWrapper` fires a one-time `setTimeout(2000)` mock (guarded by `useRef` + only when items empty) that updates `receipts.processed_data` with mock `{id, name, price}` lines.
- **AC#3:** shows an animated skeleton (`aria-busy`) while empty; on completion sets local items (no extra round-trip) so the 5.1 matrix renders; stops the spinner even on error.
- **End-to-end wiring:** `ReceiptStagingModal` now `.select("id").single()` and calls `onCreated(id)`; Trip Hub navigates to `/trips/[id]/receipts/[id]`, where the empty `processed_data` triggers the mock → matrix appears. Full flow: upload → stage → matrix hydrates.
- **⚠️ MOCK only:** seeds fixed sample lines; real OCR (PRD FR2) remains unbuilt — a future story or formal descope is still needed (readiness report gap).
- Strict ESLint clean (render-prop typed, `useEffect` cleanup, no `any`). Local review clean.

### File List

**Added:**
- `components/feature/MatrixStateWrapper.tsx`

**Modified:**
- `app/trips/[id]/receipts/[receiptId]/page.tsx` (wrap table in `MatrixStateWrapper`)
- `components/feature/ReceiptStagingModal.tsx` (`.select("id").single()`, `onCreated(id)`)
- `app/trips/[id]/page.tsx` (navigate to matrix page on create)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | `MatrixStateWrapper` mock-OCR hydration (skeleton → ~2s mock → `processed_data` update → matrix) + staging→matrix navigation. Explicitly a mock (FR2 unbuilt). Lint/build clean; local review clean. Merged into `epic-5`. | Amelia (Dev) |
