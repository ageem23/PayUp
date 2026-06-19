---
baseline_commit: 2a7bc23b9c4b1ce3f502eb5c15094b37e64dc5e3
---

# Story 8.1: Cross-Receipt Balance Aggregation & Ledger Compile Functions

Status: done

## Story

As a system developer,
I want a function to compile data from all receipts within a trip,
so that I can calculate each participant's singular net debt or credit standing across the entire trip history.

## Acceptance Criteria

1. Loops through all receipts associated with a given trip.
2. Per receipt: **paid credit** to the `paid_by` name, **consumed debt** = each person's penny-accurate share (Epic 7 engine).
3. Outputs a flat dict of net standings (paid − consumed) per unique name.
4. All net balances sum to exactly `$0.00` (accounting check); a non-zero sum halts with a telemetry warning.

## Tasks / Subtasks

- [x] **Compiler** — `utils/math/ledgerCompiler.ts`: `compileLedger(receipts, participants)` rolls each receipt through `calculateProportionalSplit` (Epic 7), credits `paid_by` the receipt grand total, debits each consumer their share, all in **integer cents**, and returns `{ net: Record<name, dollars>, balanced }`.
- [x] **Query** — pure function takes the receipts in (caller fetches under its RLS session), mirroring the Epic 7 split-engine pattern; the Settle-Up UI (8.2) does the `trip_id` fetch.
- [x] **Aggregation loop** — paid sums vs per-person consumed shares accumulated across all rows in cents.
- [x] **Zero-sum safeguard** — `balanced` flag; `console.warn` telemetry when the cent sum ≠ 0 (AC4).
- [x] **Test** — `tests/unit/ledgerCompiler.test.ts` (6 tests): single shared receipt, multi-receipt different payers, tax/tip inclusion, payer-not-in-participants, awkward-fraction exact zero-sum, empty trip.

## Dev Notes

### Why it balances structurally
Each receipt credits `paid_by` exactly its grand total and debits the consumers shares that (per Epic 7) reconcile to that same grand total — so every receipt nets to zero and the whole trip does too. Integer-cent accumulation (dollars only re-derived at output) keeps it exact across many receipts.

### Pure vs self-querying (deviation)
The story sketches a self-querying utility. Kept it **pure** (receipts passed in) for testability and to match `billCalculations`; the trip-scoped Supabase fetch lives in the 8.2 UI under the user's RLS session (no service-role key needed). [Source: mirrors 6.3 route-returns/client-persists rationale]

### Payer not in participant list
A `paid_by` name not in `participants` is still added to the net dict (credited), so its credit isn't dropped and the ledger stays balanced.

### tsconfig target
`Map` can't be `for…of`-iterated under this repo's pre-ES2015 `tsc` target — used `Map.forEach` for the output pass (same constraint Epic 7's engine worked around).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔; `npm test` → 28 passed (6 suites).
- Caught + fixed a `Map` iteration type error (pre-ES2015 target) before merge.

### Completion Notes List

- Local self-review pass; the BMAD adversarial review runs once on the full epic diff before the PR, then CodeRabbit on the PR.
- No new env or migration — consumes existing `receipts` columns (`paid_by`, `processed_data`, `split_among`, `tax`, `tip`).

### File List

**Added:**
- `utils/math/ledgerCompiler.ts`
- `tests/unit/ledgerCompiler.test.ts`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-19 | 1.0.0 | Cross-receipt net-balance compiler (integer-cent, zero-sum safeguard) consuming the Epic 7 split engine + 6-test suite. Lint+build+test green. Merged into `epic-8`. | Amelia (Dev) |
