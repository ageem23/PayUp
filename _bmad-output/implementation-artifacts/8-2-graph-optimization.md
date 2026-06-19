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

## Review Findings

_From `bmad-code-review` (adversarial: Blind Hunter + Edge Case Hunter + Acceptance Auditor) on `main...epic-8`, 2026-06-19._

- [x] [Review][Patch] Failed receipts fetch rendered as "Everyone's settled up" [app/trips/[id]/page.tsx, components/feature/SettleUpLedger.tsx] — **FIXED:** Supabase resolves (not throws) on query error, so `receiptsRes.error` is now checked explicitly; on error (or a non-`balanced` ledger) the panel shows "Couldn't calculate balances" instead of a false settled state. Repurposed the panel's dead `loading` prop into an `error` prop. (blind+edge, MEDIUM)
- [x] [Review][Patch] `compileLedger` `balanced` flag was ignored by the caller [app/trips/[id]/page.tsx] — **FIXED:** the page now consumes `balanced` from the memo and treats `!balanced` as the same error state (AC4 intent — don't show misleading transfers when the ledger doesn't reconcile). (auditor, LOW)

**Dismissed (5):**
- Sub-cent residual penny dropped in `minimizeDebts` — can't occur from `compileLedger` output (always whole-cent dollars that sum to 0); only a hand-crafted sub-cent input triggers it.
- `paid_by` null/phantom key — `receipts.paid_by` is `NOT NULL` (migration 0004) and the staging flow always sets a payer; a payer-not-in-participants is already correctly credited.
- Per-receipt rounding drift — non-issue: Epic 7's `distributeByWeight` distributes full tax/tip cents and shares reconcile exactly to `grandTotal`, so each receipt nets to zero (Auditor verified against `billCalculations.ts`).
- Stale ledger after editing a split — App Router remounts `/trips/[id]` on navigation back, so `loadTrip` refetches; live updates are Epic 12's (realtime) scope.
- Unassigned-items tax/tip even-split — existing Epic 7 fallback behavior; stays balanced; out of scope for Epic 8.

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-19 | 1.0.0 | Greedy cash-flow debt minimizer (integer-cent, deterministic) + 7-test suite; expandable Settle Up panel on the trip page wired through the 8.1 compiler. Lint+build+test green. Merged into `epic-8`. | Amelia (Dev) |
