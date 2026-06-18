---
baseline_commit: 198098bf8667ccd34f7b4778b5f21c3df939cb04
---

# Story 6.1: Matrix Cell Checkbox Rendering & Dynamic State Mapping Loop

Status: done

## Story

As a user splitting a bill,
I want a checkbox in every item×participant cell of the matrix,
so that I can link participants to the line items they consumed.

## Acceptance Criteria

1. The matrix renders an interactive cell for every line-item row × participant column.
2. Cells contain a high-contrast, touch-friendly checkbox that clearly shows selected state.
3. Toggling a checkbox updates local component state immediately with crisp feedback.
4. Hovering a cell highlights its column header and row, reducing mis-clicks.

## Tasks / Subtasks

- [x] **Stateful matrix grid** — `components/feature/ReceiptMatrix.tsx` (`"use client"`): holds the assignment state in the `split_among` shape (`{ item_id, assigned_participants }[]`), seeded from the receipt's existing `split_among`; exposes `isAssigned(itemId, participant)` + `toggle(itemId, participant, checked)`; renders the header + one `MatrixRowItem` per line item. (Local state only here — **Story 6.2** persists it.)
- [x] **Row component** — `components/feature/MatrixRowItem.tsx`: renders item name, cost (safe `formatPrice`), and a checkbox per participant (`h-5 w-5`, accessible `aria-label`).
- [x] **Hover affordance** (AC#4) — row `hover:` highlight + a `hoveredParticipant` state that highlights the matching column header.
- [x] **Wire into the matrix page** — `app/trips/[id]/receipts/[receiptId]/page.tsx`: also fetch `split_among`; replace the inline placeholder table (inside `MatrixStateWrapper`) with `<ReceiptMatrix items=… participants=… initialSplitAmong=… />`; move `formatPrice` out of the page (now in `MatrixRowItem`).
- [x] **Verify** — `npm run lint` + `npm run build` clean.

## Dev Notes

### State shape (forward-compatible with 6.2)
`split_among` is the persisted shape `Array<{ item_id: string; assigned_participants: string[] }>` (per the architecture + Story 6.2). 6.1 holds this **locally** (initialized from `receipts.split_among`); `toggle` edits only the matching `item_id` node, preserving the others. 6.2 adds `patchReceiptSplits` to write it back + a `SyncStatusBar`, binding into `toggle`.

### Consumes prior work
- 5.1 matrix page + `MatrixStateWrapper` (5.2): the wrapper's render-prop still provides `items`; the table moves into `ReceiptMatrix`. `LineItem` type imported from `MatrixStateWrapper`.
- Add `split_among` to the receipt `select(...)`; type it `SplitAllocation[] | null` (assert, not `any`).
- Strict ESLint: no `any`, no unused (remove the page's now-unused `formatPrice`); typed checkbox `onChange` (`ChangeEvent<HTMLInputElement>` inferred).

### Project Structure Notes
- New: `components/feature/ReceiptMatrix.tsx`, `components/feature/MatrixRowItem.tsx`. Modified: the matrix page. No DB change (uses existing `receipts.split_among`). "Tested" = lint + build (Jest arrives in 6.2).

### References
- [Source: docs/docs/prd/epic-6/story_06_1_checkbox_grid.md] — story, ACs, checkbox snippet
- [Source: docs/docs/prd/epic-6/story_06_2_jsonb_patch.md] — `split_among` allocation shape this seeds
- [Source: _bmad-output/implementation-artifacts/5-1-matrix-ui.md] — matrix page/table this refactors

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` clean; `npm run build` clean (matrix page dynamic).

### Completion Notes List

- **AC#1/#2/#3:** `ReceiptMatrix` renders a checkbox per item×participant cell (`h-5 w-5`, `accent-foreground`, `aria-label`); toggling updates local `split_among`-shaped state immediately.
- **AC#4:** row `hover:bg-neutral-50` + a `hoveredParticipant` state highlighting the matching column header.
- **State integrity:** `toggle` edits only the matching `item_id` node (preserving other lines), seeded from `receipts.split_among` — forward-compatible with Story 6.2's `patchReceiptSplits`.
- Matrix page now fetches `split_among` and delegates the table to `ReceiptMatrix`; the page's `formatPrice` moved into `MatrixRowItem` (no unused symbols).
- Strict ESLint clean (no `any`, typed props). Local review clean. (Local state only — 6.2 persists.)

### File List

**Added:**
- `components/feature/ReceiptMatrix.tsx`
- `components/feature/MatrixRowItem.tsx`

**Modified:**
- `app/trips/[id]/receipts/[receiptId]/page.tsx` (fetch `split_among`, render `ReceiptMatrix`)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Interactive checkbox grid (`ReceiptMatrix` + `MatrixRowItem`) with local `split_among` state + hover highlighting. Lint/build clean; local review clean. Merged into `epic-6`. | Amelia (Dev) |
