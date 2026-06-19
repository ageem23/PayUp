---
baseline_commit: 0435d3c2290a35f55031325af9581acabe118f50
---

# Story 8.2: Minimized Cash-Flow Debt-Graph Calculation Engine & UI Layout

Status: done

## Story

As a trip participant looking to square my debts,
I want the system to minimize the number of peer-to-peer transfers needed to settle the trip,
so that we can clear all group debts with the fewest possible individual transactions.

## Acceptance Criteria

1. Net balances run through a greedy debt-matching routine.
2. Iteratively pairs the largest absolute debtor with the largest absolute creditor.
3. Circular/redundant chains (A→B→C) resolve to minimal direct steps (A→C).
4. Instructions render in an expandable "Settle Up" component at the base of `/trips/[id]`.
5. Transactions show explicit direction (e.g. `Alice pays Mathieu $25.50`).

## Tasks / Subtasks

- [x] **Engine** — `utils/math/debtMinimizer.ts`: `minimizeDebts(netBalances)` → `SettlementTransfer[]`. Greedy cash-flow minimization in **integer cents**: each round picks the largest creditor + largest debtor (`pickExtreme`, name tiebreak → deterministic), settles `min(credit, debt)`, repeats until squared. Collapses chains and zeroes ≥1 party per transfer.
- [x] **Tests** — `tests/unit/debtMinimizer.test.ts` (7 tests): one-to-one, circular-chain collapse (AC3), largest-vs-largest pairing, paired balances → N/2 transfers, already-settled → none, messy multi-party fully settles in ≤ N−1, determinism by name.
- [x] **UI** — `components/feature/SettleUpLedger.tsx`: expandable `<details>` panel rendering `"{from} pays {to} ${amount}"` (AC5), an empty state ("Everyone's settled up 🎉"), and a transfer count.
- [x] **Wire** — `app/trips/[id]/page.tsx`: fetches the trip's receipts alongside the trip (one RLS-scoped query pair), runs `compileLedger` → `minimizeDebts` in a `useMemo`, and renders `<SettleUpLedger>` at the base of the workspace.

## Dev Notes

### Algorithm
Greedy largest-debtor/largest-creditor matching (AC2). Not the theoretical NP-hard minimum, but it reliably collapses chains and settles in ≤ N−1 transfers — the standard, predictable approach. Integer cents throughout so no fractional residue lingers; deterministic via name tiebreak so the same ledger always yields the same instructions.

### Data flow
Reuses 8.1's `compileLedger` (which reuses the Epic 7 split engine). The trip page now also selects `paid_by, processed_data, split_among, tax, tip` for the trip's receipts. The panel recomputes reactively via `useMemo` on receipts/participants.

### No new env / migration
Reads existing `receipts` columns only.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔ (`/trips/[id]` 4.78 kB); `npm test` → 35 passed (7 suites).

### Completion Notes List

- Local self-review pass; BMAD adversarial review runs once on the full epic diff before the PR, then CodeRabbit on the PR.

### File List

**Added:**
- `utils/math/debtMinimizer.ts`
- `tests/unit/debtMinimizer.test.ts`
- `components/feature/SettleUpLedger.tsx`

**Modified:**
- `app/trips/[id]/page.tsx` (fetch receipts; compute + render Settle Up panel)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-19 | 1.0.0 | Greedy cash-flow debt minimizer (integer-cent, deterministic) + 7-test suite; expandable Settle Up panel on the trip page wired through the 8.1 compiler. Lint+build+test green. Merged into `epic-8`. | Amelia (Dev) |
