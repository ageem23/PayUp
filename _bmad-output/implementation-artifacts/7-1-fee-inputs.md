---
baseline_commit: 1d05fa3b6979db0739f0260790099d2a1c57ed71
---

# Story 7.1: Global Operational Expense Overrides & Fee Input Components

Status: done

## Story

As a trip organizer managing a complex group bill,
I want high-visibility entry fields to input the exact total tax and tip amounts printed on the receipt,
so that the computational engine has the base constants required to run proportional scaling calculations.

## Acceptance Criteria

1. The sidebar/header panel within the receipt splitting view provides dedicated numeric inputs for "Tax ($)" and "Tip ($)".
2. Inputs handle floating-point numbers gracefully, stripping non-numeric values and preventing negatives.
3. Modifying an input instantly updates the in-memory state (the constants Story 7.2's math consumes).
4. Input fields persist to the database row on change, surviving a page reload.

## Tasks / Subtasks

- [x] **DB columns** — `supabase/migrations/0005_receipt_fees.sql`: adds `tax`/`tip` `numeric(10,2) not null default 0` to `public.receipts` with `>= 0` check constraints. Idempotent; **applied manually in Supabase** (deploy-time), per the architecture note.
- [x] **Persistence util** — `utils/db/receiptFees.ts`: `patchReceiptFees(receiptId, {tax, tip})` writes both columns in one update, sanitizes to non-negative/finite, and treats a zero-row write as a failure (stale id / RLS), mirroring `patchReceiptSplits`.
- [x] **Inputs** — `components/feature/ReceiptSummarySidebar.tsx`: controlled "Tax ($)"/"Tip ($)" `type=number` fields (`step=0.01`, `min=0`, `inputMode=decimal`). `parseFeeInput()` coerces blank/garbage/negative → 0. Reuses `SyncStatusBar` for save feedback.
- [x] **State + autosave** — `components/feature/ReceiptSplitView.tsx`: owns `tax`/`tip` state (so 7.2 can read them), debounces persistence (600 ms), serializes writes with a save chain + seq (no stale completion flashes), and skips redundant/mount writes via `savedRef`.
- [x] **Wire the page** — `app/trips/[id]/receipts/[receiptId]/page.tsx`: selects `tax,tip`, renders `ReceiptSplitView` (sidebar + matrix) instead of the bare matrix, seeding `initialTax`/`initialTip`.
- [x] **Test** — `tests/integration/db/receiptFees.test.ts`: writes tax+tip together, clamps negative/NaN → 0, throws on Supabase error and on zero-row writes.

## Dev Notes

### Where tax/tip live
`receipts` had no fee columns, so a migration adds `tax`/`tip` (not the existing `amount`, which is the legacy single-value field). Migration is **manual deploy-time** in Supabase — CI does not apply it. Until applied, the page's `select("...,tax,tip")` will error on the deployed DB; the columns default to 0 so existing rows are unaffected once applied.

### Debounced, serialized autosave
Fee edits fire a burst of keystrokes, so persistence is debounced (600 ms) rather than per-change. Writes are queued on a promise chain and gated by a monotonic seq so a slow earlier save can't overwrite a newer one or flash a stale status — the same discipline `ReceiptMatrix` uses for split toggles. `savedRef` prevents a save on mount and redundant writes.

### State lifted for Story 7.2
`tax`/`tip` live in `ReceiptSplitView` (not the sidebar) so the proportional-math engine (7.2) can consume them alongside the split allocations without another refactor. 7.2 will additionally lift the split state up to this container.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔ (`/trips/[id]/receipts/[receiptId]` 4.07 kB); `npm test` → 13 passed (3 suites).

### Completion Notes List

- Local self-review pass (correctness/security): no findings. The authoritative cloud review runs once on the epic PR (CodeRabbit).
- **Manual deploy step:** apply `0005_receipt_fees.sql` in the Supabase SQL editor before the deployed app reads `tax`/`tip`.

### File List

**Added:**
- `supabase/migrations/0005_receipt_fees.sql`
- `utils/db/receiptFees.ts`
- `components/feature/ReceiptSummarySidebar.tsx`
- `components/feature/ReceiptSplitView.tsx`
- `tests/integration/db/receiptFees.test.ts`

**Modified:**
- `app/trips/[id]/receipts/[receiptId]/page.tsx` (select tax/tip, render `ReceiptSplitView`)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-19 | 1.0.0 | Tax/Tip fee inputs with debounced+serialized autosave; `receipts.tax`/`tip` migration; `patchReceiptFees` util + test. Lint+build+test green. Merged into `epic-7`. | Amelia (Dev) |
