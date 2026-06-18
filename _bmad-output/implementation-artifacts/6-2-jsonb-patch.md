---
baseline_commit: 09b302dbb393e59df1c254e7585eb6d91c1fb702
---

# Story 6.2: JSONB Document Update Handlers & Partial Patch Mutations Pipeline

Status: done

## Story

As an expense collaborator,
I want checkbox clicks to auto-save the split allocations into the receipt row,
so that assignments persist instantly without a manual save button.

## Acceptance Criteria

1. Toggling a cell computes the updated `split_among` allocation array.
2. The change is written with a single `update` on the receipt's `id`.
3. The write replaces `split_among` while preserving every other line's allocation.
4. A sync indicator transitions between "Saving updates…" and "All changes saved".

## Tasks / Subtasks

- [x] **Stand up Jest** — added `jest`, `@types/jest`, `jest-environment-jsdom`, `ts-node`; `jest.config.ts` via `next/jest` (jsdom env + `@/*` moduleNameMapper); `"test": "jest"` script; a **Test** step in `ci.yml` (with placeholder Supabase env). Convention is now **lint + build + test**.
- [x] **Patch handler** — `utils/db/matrixPatch.ts`: `patchReceiptSplits(receiptId, payload)` → `update({ split_among: payload }).eq("id", …).select()`, throws on error; exports `interface ReceiptSplitAllocation { item_id; assigned_participants }`.
- [x] **Sync indicator** — `components/feature/SyncStatusBar.tsx` (idle/saving/saved/error).
- [x] **Auto-save wiring** — `ReceiptMatrix.toggle` computes the next full array via the pure `applyToggle` (preserves other items), sets state, and calls `patchReceiptSplits` with the **complete** array, driving `SyncStatusBar`. No manual save button.
- [x] **Tests** — `tests/integration/db/matrixPatch.test.ts` (mocked client): asserts the updated `assigned_participants` array is sent, an empty array stays `[]` (not null), and errors throw.

## Dev Notes

- **Full-array writes:** `split_among` is one JSONB column — `patchReceiptSplits` always receives the entire allocation array (with unrelated items intact). `applyToggle` is pure and only edits the matching `item_id` node. [Source: docs/docs/prd/epic-6/story_06_2_jsonb_patch.md#Dev Notes]
- **Empty ≠ null:** an item with no assignees keeps `assigned_participants: []` — verified by test.
- **Jest + the env guard:** the test mocks `@/utils/supabase/client`, so the real module's env guard never runs; CI's Test step also sets placeholder env as a backstop. Tests run under `jest-environment-jsdom` via `next/jest`.
- **Build/typecheck:** test files are type-checked by `next build` (jest globals from `@types/jest`); they aren't bundled into the app.
- Strict ESLint clean (no `any`, no unused). Local review clean.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔; `npm test` → 3 passed.

### Completion Notes List

- Jest stood up via `next/jest` (first test framework in the repo); CI extended to lint+build+test.
- Auto-save persists `split_among` on every toggle; sync status shown to the user.
- Forward: Story 6.3 (Gemini OCR) reuses this Jest setup for `app/api/ocr/route.ts` tests.

### File List

**Added:**
- `jest.config.ts`
- `utils/db/matrixPatch.ts`
- `components/feature/SyncStatusBar.tsx`
- `tests/integration/db/matrixPatch.test.ts`

**Modified:**
- `components/feature/ReceiptMatrix.tsx` (auto-save + sync status)
- `app/trips/[id]/receipts/[receiptId]/page.tsx` (pass `receiptId`)
- `.github/workflows/ci.yml` (Test step)
- `package.json` / `package-lock.json` (Jest deps + `test` script)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Stood up Jest (lint+build+test); `patchReceiptSplits` auto-saves the full `split_among` array on each checkbox toggle, with a `SyncStatusBar`. Tests + CI test step. Merged into `epic-6`. | Amelia (Dev) |