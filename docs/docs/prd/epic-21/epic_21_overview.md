# Epic 21: Even-Split Mode

## Overview
PayUp today can only settle a receipt by **itemizing** it — you must assign line items to people via the assignment matrix. That's PayUp's strength for restaurant bills, but it's a hard precondition: a receipt with no usable OCR items (a flat charge, a booking fee, a scan that didn't parse) can't be split at all, and plenty of real splits are just *"divide this evenly among us — I don't care about the items."*

This epic adds a second, non-itemized path: **Even-Split Mode**. The user picks a subset of the trip's participants and PayUp divides the receipt's **grand total** equally among exactly those people. It's the one gap we chose to close from the Splitwise comparison (Splitwise's "split equally" path); we are deliberately **not** building percentages/shares yet.

**Scope (validated with the PM):**
- A receipt is **either** itemized (today's matrix) **or** even-split — never both. One mode per receipt; switching modes is explicit and discards the other mode's data.
- Even mode divides the **grand total** (items + proportional tax + tip, **or** a manually-entered total when there are no items) **equally** among the selected participants.
- **Equal only** for v1. `paid_by` is unchanged. Settle-up (debt minimization) reflects the even split.
- Cent-exact with deterministic leftover-cent distribution (same discipline as OCR quantity-split and proportional tax/tip).

**Out of scope (deferred):** percentages / shares / exact-amount splitting; mixing itemized + even on one receipt.

## Target Approach & Technical Notes
* **The total-source decision (21.1) is the crux.** Even-split must work on an **itemless** receipt, so it can't just reuse "assign every item to the selected people" (that breaks with no items). The receipt needs a real **total** to divide. The `receipts` table already has an **`amount numeric(10,2)`** column that is currently written as `0` and otherwise unused — the natural home for the even-mode total: auto-fill it from `sum(items) + tax + tip` when items exist, allow **manual entry** when they don't. Add `split_mode` (`itemized` | `even`, default `itemized`) and `even_split_among` (JSONB participant-name array). Migration **`0017`**. Winston (architect) finalizes the exact column shape; the story's AC1 pins the decision.
* **Settle-up branch (21.2).** `compileLedger` nets *paid − consumed* per receipt (`utils/math/ledgerCompiler.ts`; payer is credited `grandTotal`, consumers debited their share). For `split_mode = 'even'`, replace the per-item consumption calc with: each name in `even_split_among` is debited `total ÷ N` (cents, leftover distributed), and `paid_by` is credited the `total`. The **itemized path is untouched**. `LedgerReceipt` gains `split_mode`, `even_split_among`, and the total. Pure, unit-tested.
* **UI (21.3).** A mode toggle on the receipt page; in even mode, hide the matrix and show a **participant multi-select** + a live "**$X.XX each**" readout. Switching modes is explicit and **discards** the other mode's data (a confirm, since it's destructive). Manual-total entry surfaces when the receipt has no items.
* **Realtime (21.4).** `split_mode` / `even_split_among` / `amount` sync over the existing per-receipt `receipt:${id}` channel (Epic 12), echo-guarded like the other editable fields (Story 20.4) — no new channel, no realtime migration (the columns ride the existing `receipts` publication).
* **No itemized regression.** Existing receipts default to `itemized`; the matrix, proportional tax/tip, quantity-split, and settle-up behave exactly as before.

## Success Metric
Share of receipts that opt into **even mode** — tells us whether to invest in percentages/shares next. PayUp has no analytics today, so this is a **measurement note**, not a build story; revisit if/when instrumentation lands.

## Epic Backlog Registry
* **Story 21.1:** Split Mode + Total Source (data model + migration `0017`)
* **Story 21.2:** Even-Split Settle-Up Math (`compileLedger` branch + tests)
* **Story 21.3:** Even-Split Mode UI (toggle, participant select, live per-person total)
* **Story 21.4:** Realtime Sync + Regression Verification

**Sequencing note:** strict order. 21.1 establishes the data model + total source (the architectural decision); 21.2 makes settle-up correct; 21.3 is the user-facing mode; 21.4 wires realtime and verifies no itemized regression. One migration, in 21.1.

---

## Story 21.1: Split Mode + Total Source
**As a** developer building even-split,
**I want** a receipt-level split mode and a reliable total source,
**so that** a receipt can be divided evenly even when it has no line items.

### Acceptance Criteria
1. **The total-source decision is made and documented**: even mode divides a receipt **total** that works with **zero line items** — auto-filled from `sum(items) + tax + tip` when items exist, **manually settable** when they don't. (Recommended: use the existing `receipts.amount` column as that total.)
2. `receipts` gains `split_mode` (`itemized` | `even`, default `itemized`) and `even_split_among` (JSONB array of participant names, default `[]`); migration `0017_even_split_mode.sql`, applied manually in Supabase.
3. Existing receipts are unaffected — they read as `itemized` with their current behavior.
4. The new columns are covered by the existing receipts RLS (members can read/write per current policies); no widening of access.
5. `npm run lint` + `npm run build` + `npm test` clean. **Manual Supabase apply** of `0017`.

## Story 21.2: Even-Split Settle-Up Math
**As a** trip member,
**I want** settle-up to divide an even-split receipt equally,
**so that** everyone selected owes their fair, cent-exact share.

### Acceptance Criteria
1. In `compileLedger`, when a receipt's `split_mode` is `even`: each participant in `even_split_among` is charged `total ÷ N`; `paid_by` is credited the full `total`; the net feeds debt minimization unchanged.
2. Division is **cent-exact**: `floor(totalCents / N)` each, leftover cents distributed deterministically to the first few so the parts sum to the total (no money created or lost).
3. The **itemized path is unchanged** — existing receipts produce identical ledgers (regression-guarded by the current tests).
4. Edge cases handled: `even_split_among` empty or `N = 0` (no charge / no crash), itemless receipt (uses the total), `total = 0`.
5. Unit tests cover even division, indivisible-cent division, itemless receipt, single participant, and the value-preserving invariant. `npm run lint` + `npm run build` + `npm test` clean.

## Story 21.3: Even-Split Mode UI
**As a** person splitting a receipt,
**I want** to switch a receipt to "even split" and pick who shares it,
**so that** I can divide the whole bill without itemizing.

### Acceptance Criteria
1. The receipt page has a **mode toggle** (Itemized / Even split). In even mode the assignment matrix is hidden and an even-split panel is shown.
2. The even-split panel offers a **participant multi-select** (subset of the trip's participants) and a live "**$X.XX each**" readout that updates as the selection changes (cent-exact, matching 21.2).
3. When the receipt has **no items**, a **total input** is shown so the user can enter the amount to divide; when it has items, the total is derived (and visible).
4. Switching modes is **explicit and destructive-safe**: a confirm warns that the other mode's assignments will be cleared, and on confirm the other mode's data is discarded.
5. `paid_by` editing is unchanged and available in both modes. `npm run lint` + `npm run build` + `npm test` clean.

## Story 21.4: Realtime Sync + Regression Verification
**As a** collaborator,
**I want** even-split changes to sync live and itemized receipts to keep working,
**so that** the new mode is consistent across clients with no regressions.

### Acceptance Criteria
1. Remote changes to `split_mode`, `even_split_among`, and the even-mode total sync live via the existing `receipt:${id}` channel, echo-guarded like the Story 20.4 fields (no second channel, no migration).
2. A receipt switched to even mode (or back) reflects on other clients without a refresh; an in-progress local selection isn't clobbered by the echo of its own write.
3. **No itemized regression**: matrix assignment, proportional tax/tip, quantity-split, and settle-up are unchanged for itemized receipts (verified by the suite + a manual pass).
4. Full `npm run lint` + `npm run build` + `npm test` green. Manual smoke (on the PR preview): even-split a receipt across two clients; confirm the per-person amount and settle-up; confirm an itemless receipt with a manual total works.
