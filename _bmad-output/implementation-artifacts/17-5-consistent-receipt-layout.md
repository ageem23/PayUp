# Story 17.5: Consistent Receipt Layout

Status: ready-for-dev

## Story

As a user splitting a receipt,
I want the receipt view ordered the same way on desktop and mobile — image, then participant checkboxes, then fees,
so that the experience is consistent across devices.

## Acceptance Criteria

1. On **desktop**, the receipt split view stacks vertically in this order: receipt **image** → participant **assignment matrix** → **fees/total** summary.
2. The previous desktop two-column (`lg:`) arrangement is removed in favor of the single stacked order.
3. Mobile ordering is unchanged (already image → matrix → fees).
4. Purely a presentational reorder — assignment, per-participant shares, proportional fees, and totals are functionally unchanged.
5. Verified at both mobile and desktop breakpoints.

## Tasks / Subtasks

- [ ] **Collapse to a single stacked column** (AC: 1, 2) — in the receipt split view, remove the `lg:` two-column grid so `ReceiptMatrix` and `ReceiptSummarySidebar` no longer sit side-by-side; render image → matrix → fees/total in one vertical flow at all breakpoints.
- [ ] **Preserve mobile order** (AC: 3) — confirm the existing mobile ordering (Epic 13.7) is unchanged.
- [ ] **No functional change** (AC: 4) — assignment, proportional tax/tip (Epic 7), and totals behave exactly as before; this is layout-only.
- [ ] **Verify breakpoints** (AC: 5) — check the view at mobile and desktop widths.
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **Epic 13.7 already made mobile lead with the matrix above fees**; this story brings desktop into the same single-column order rather than its `lg:` two-column split. [Source: docs/docs/prd/epic-13/epic_13_overview.md]
- **Single-column stacked is the chosen design** (per product decision) — don't keep a two-column desktop variant. [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-175-consistent-receipt-layout]
- Touch the layout wrapper only (the `ReceiptSplitView`/grid that arranges image + `ReceiptMatrix` + `ReceiptSummarySidebar`); leave the child components' internals alone.

### Project Structure Notes

- Modify the receipt split-view layout component under `components/feature/` (the wrapper composing the receipt image, `ReceiptMatrix`, and `ReceiptSummarySidebar`). Confirm the exact filename in the repo before editing.

### References

- [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-175-consistent-receipt-layout]
- [Source: docs/docs/prd/epic-13/epic_13_overview.md#story-137-mobile-layout--assignment-matrix-above-fees--total]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
