# Story 21.2: Even-Split Settle-Up Math

Status: ready-for-dev

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

### Debug Log References

### Completion Notes List

### File List
