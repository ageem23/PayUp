# Story 21.2: Even-Split Settle-Up Math

Status: done

## Story

As a trip member, I want settle-up to divide an even-split receipt equally, so that everyone selected owes their fair, cent-exact share.

(Full acceptance criteria: [docs/docs/prd/epic-21/epic_21_overview.md](../../docs/docs/prd/epic-21/epic_21_overview.md#story-212-even-split-settle-up-math).)

## Tasks / Subtasks

- [ ] **Branch `compileLedger`** (AC: 1) — in `utils/math/ledgerCompiler.ts`, when `receipt.split_mode === 'even'`: debit each name in `even_split_among` `total ÷ N`, credit `paid_by` the full `total`; feed the same `net` map into debt minimization. When `split_mode` is `itemized` (or absent), use the existing per-item path unchanged.
- [ ] **Cent-exact division** (AC: 2) — compute in integer cents: `base = floor(totalCents / N)`, distribute the `totalCents % N` remainder one cent each to the first `r` participants so the debits sum to exactly `totalCents` (mirror the OCR quantity-split helper).
- [ ] **Extend `LedgerReceipt`** — add `split_mode`, `even_split_among`, and the total (`amount`) so the compiler can read them (depends on 21.1 types).
- [ ] **Edge cases** (AC: 4) — `even_split_among` empty / `N = 0` → no charge, no divide-by-zero; itemless receipt → uses the total; `total = 0` → no-op.
- [ ] **Tests** (AC: 5) — even division (e.g. $30 ÷ 3), indivisible cents (e.g. $10 ÷ 3 → 3.34/3.33/3.33), itemless receipt with a manual total, single participant, and the value-preserving invariant (debits + credit net to zero per receipt). Keep/confirm the existing itemized ledger tests pass (AC: 3).
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **`compileLedger` shape:** it nets *paid − consumed* per receipt — credits `bump(receipt.paid_by, cents(split.grandTotal))` and debits each consumer their computed share, then returns `{ net, balanced }` which `minimizeDebts` turns into transfers. The even branch replaces the *consumer* calc only. [Source: utils/math/ledgerCompiler.ts]
- **Reuse the cent-distribution pattern** already proven in `utils/ocr/expandQuantity.ts` (floor + remainder-to-first) and the proportional tax/tip engine — don't reinvent it. [Source: utils/ocr/expandQuantity.ts]
- **Pure + unit-tested** — this story is logic only, no UI. The `balanced` invariant must hold so the trip page still renders transfers.

### Project Structure Notes

- Modify `utils/math/ledgerCompiler.ts`; add tests under `tests/unit/`. No DB or UI change.

### References

- [Source: docs/docs/prd/epic-21/epic_21_overview.md#story-212-even-split-settle-up-math]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- New pure helper `utils/math/evenSplit.ts` → `splitCentsEvenly(totalCents, n)`: `floor` base + leftover cents to the first parts, sums back to the total; `[]` for `n <= 0`. Shared with the 21.3 UI so the readout and the ledger agree.
- `compileLedger` branches on `split_mode === 'even'`: credits `paid_by` the full `amount` (cents) and debits each `even_split_among` name a `splitCentsEvenly` share. **Nobody selected → the receipt contributes nothing** (no unbalanced credit); itemless receipts work because the total is `amount`. The itemized path is untouched.
- +8 unit tests (3 helper + 5 ledger): even division, indivisible cents, itemless, single participant, empty selection, each asserting the **balanced** (value-preserving) invariant. Existing 90 still pass (itemized regression guard, AC3) → **98 total**.
- `npm run lint` (exit 0) + `npm run build` + `npm test` (98) clean.

### File List

**Added:**
- `utils/math/evenSplit.ts`
- `tests/unit/evenSplit.test.ts`

**Modified:**
- `utils/math/ledgerCompiler.ts`
