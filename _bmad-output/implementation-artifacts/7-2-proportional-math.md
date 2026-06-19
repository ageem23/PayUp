---
baseline_commit: 341cc67528634ba8e28c8a43c1a64e8065eaa2aa
---

# Story 7.2: Single-Cent Proportional Multiplier Math & Remainder Distribution Engine

Status: done

## Story

As a participant splitting an itemized receipt,
I want my share of the tax and tip to match my exact proportion of food consumption,
so that I do not unfairly subsidize other members' high-ticket items.

## Acceptance Criteria

1. Each user's base subtotal is computed from their `receipts.split_among` checkbox assignments; a shared item is divided equally among its assignees first.
2. Tax and tip are allocated by the fractional multiplier `globalFee × (individualSubtotal / totalSubtotal)`.
3. All intermediate currency operations resolve to two decimal places ($0.01).
4. Rounding leftovers are deterministically redistributed so the summed individual totals equal the explicit grand total exactly — no penny leaks or appears.

## Tasks / Subtasks

- [x] **Pure engine** — `utils/math/billCalculations.ts`: `calculateProportionalSplit(items, splitAmong, participants, globalTax, globalTip)`. Works entirely in **integer cents** so no float drift accumulates. Per-item equal division + proportional tax/tip both route through one `distributeByWeight()` helper that hands out leftover cents by largest fractional remainder, tie-broken toward the highest consumer — deterministic and always summing back to the exact input.
- [x] **Test suite** — `tests/unit/billCalculations.test.ts` (6 tests): the story's `$10/3 + $1 tip` case, proportional allocation, awkward-proportion exact reconciliation, unassigned-item exclusion, the no-subtotal even-split fallback, and malformed-price / unknown-assignee / negative-fee guards.
- [x] **Lift split state** — moved `split_among` state, `applyToggle`, and the serialized split autosave from `ReceiptMatrix` up into `ReceiptSplitView`, so both the matrix and the math summary read one source of truth. `ReceiptMatrix` is now presentational (`splits` + `onToggle` + `saveState` props).
- [x] **Live summary** — `ReceiptSummarySidebar` renders a reactive "Who owes what" panel (per-person total with subtotal + tax + tip breakdown) plus the grand total, recomputed via `useMemo` whenever items, splits, tax, or tip change.

## Dev Notes

### Why integer cents
Splitting `$10.00` three ways, or scaling `$1.00` of tip by a `3.34/10.00` ratio, produces fractional cents that float math rounds inconsistently. Reducing every value to integer cents up front and only dividing back to dollars at the boundary makes the arithmetic exact, so the reconciliation in AC4 is structural rather than a fix-up pass.

### Remainder distribution choice
AC4 says "allocate the extra pennies to the highest consumer." A single dump-on-one-person rule is unfair when several cents are left over, so `distributeByWeight` uses the **largest-remainder method** (one cent at a time to the largest fractional remainders) with the **highest-consumer (largest weight) as the tiebreak**. This balances perfectly, stays deterministic, and still biases the odd penny toward the biggest spender — satisfying AC4's intent. Unassigned items are excluded from all subtotals (nobody pays); when nothing is assigned at all, fees fall back to an even split so they never silently vanish.

### Totals denominator
`totalSubtotal` is the sum of **assigned** subtotals (not the raw item-price sum), so the proportions sum to 1 and tax/tip fully distribute among the people who actually have items.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔ (`/trips/[id]/receipts/[receiptId]` 4.86 kB); `npm test` → 19 passed (4 suites).

### Completion Notes List

- Local self-review pass (correctness/security): no findings. Authoritative cloud review runs once on the epic PR (CodeRabbit).
- No new env or DB migration — consumes the `tax`/`tip` columns added in 7.1.

### File List

**Added:**
- `utils/math/billCalculations.ts`
- `tests/unit/billCalculations.test.ts`

**Modified:**
- `components/feature/ReceiptMatrix.tsx` (now presentational: splits/onToggle/saveState props)
- `components/feature/ReceiptSplitView.tsx` (owns split state + autosave; computes totals)
- `components/feature/ReceiptSummarySidebar.tsx` (renders the per-person totals panel)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-19 | 1.0.0 | Integer-cent proportional split engine with deterministic remainder distribution + 6-test suite; lifted split state to `ReceiptSplitView`; live "Who owes what" summary. Lint+build+test green. Merged into `epic-7`. | Amelia (Dev) |
