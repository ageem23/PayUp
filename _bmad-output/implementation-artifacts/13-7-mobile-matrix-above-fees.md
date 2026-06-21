---
baseline_commit: bf1c6b58fb5ae099142e238a39951cf004633ab1
---

# Story 13.7: Mobile Layout — Assignment Matrix Above Fees & Total

Status: done

## Story

As a mobile user,
I want the who-shares checkboxes shown before the tip and total,
so that I assign items first and read the totals after, without scrolling back up.

## Acceptance Criteria

1. On mobile (single-column) the assignment matrix (`ReceiptMatrix`) renders **above** the fees (tax/tip) and total summary.
2. The desktop two-column layout (`lg:`) is unchanged.
3. Purely a visual reordering — no functional change; verified at both mobile and desktop breakpoints.

## Tasks / Subtasks

- [x] Add `order-1 lg:order-2` to the matrix column and `order-2 lg:order-1` to the sidebar in `ReceiptSplitView`'s grid. Mobile (`grid-cols-1`) shows the matrix first; `lg` restores sidebar-left / matrix-right against the `[16rem_1fr]` track. (AC1, AC2)
- [x] Thread a `className` prop through `ReceiptSummarySidebar` so the ordering class lands on its root `<aside>`. (AC1)
- [x] No logic touched — ordering only. (AC3)
- [x] `npm run lint` + `npm run build` clean.

## Dev Notes

### Source order unchanged, visual order via `order`
The sidebar stays first in JSX (so the desktop grid places it in the 16rem column). CSS `order` flips the visual order on mobile only: matrix `order-1` before sidebar `order-2`. At `lg` the `order` values swap back, so the desktop layout is byte-for-byte the same as before.

### Why not just reorder the JSX
Reordering the JSX would also swap the desktop columns (matrix would land in the 16rem track). Using `order` keeps the desktop two-column layout intact while changing only the mobile stack order — exactly the AC2 constraint.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- CSS-only change; no DB, API, or behavior impact.

### File List

**Modified:**
- `components/feature/ReceiptSplitView.tsx`
- `components/feature/ReceiptSummarySidebar.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Reorder the receipt split layout so the assignment matrix sits above the fees/total on mobile; desktop two-column layout preserved via responsive `order`. | Amelia (Dev) |
