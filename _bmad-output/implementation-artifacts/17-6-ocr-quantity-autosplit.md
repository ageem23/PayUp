# Story 17.6: Auto-Split Quantity Line Items

Status: ready-for-dev

## Story

As a user splitting a receipt that has multi-quantity items,
I want each quantity expanded into separate line items,
so that I can assign individual units to different people.

## Acceptance Criteria

1. The Gemini OCR structured schema captures a `quantity` per line item, and the prompt instructs the model to take quantity **only from a leading number in the receipt's first (quantity) column** and to report `price` as the line's **extended (total) price**. When the first column has no number, `quantity` is 1.
2. A line is expanded **server-side, in code** (not by the model emitting duplicate lines) **only when its quantity is a whole number ≥ 2** — into that many separate line items.
3. **Fractional / non-integer quantities** (e.g., 0.5, 1.5 — weight- or measure-priced items) and quantity ≤ 1 are **not** split; the line passes through unchanged as a single item at its full line total. (You can't make assignable units out of a partial item.)
4. For an integer split, each expanded item's price = line total ÷ quantity, with the **leftover cent distributed** across the items so their sum exactly equals the original line total.
5. **Value-preserving invariant:** processing never reduces the total — the sum of items afterward equals the sum before, and receipt-total reconciliation (sum of items vs the extracted `total`) is preserved. When quantity is absent, non-numeric, or fractional, **do not split** (keep the full-priced line) rather than risk an undercount.
6. Items with no detected quantity pass through unchanged.
7. Expanded items receive distinct ids so they can be assigned and split independently in the matrix, and sensible names (the item name without a quantity prefix).
8. Tests cover: an even split (2 @ $6.00 → 3.00/3.00), an uneven split (3 @ $10.00 → 3.34/3.33/3.33), a **fractional quantity** (0.5 and 1.5 → not split, unchanged), quantity 1 / missing / non-numeric first column (unchanged), and confirm the value-preserving invariant in each.

## Tasks / Subtasks

- [ ] **Extend the OCR schema** (AC: 1) — in `app/api/ocr/route.ts`, add `quantity: { type: Type.NUMBER, nullable: true }` to each `items` entry's `responseSchema`. Keep `price` but make its meaning explicit in the prompt: the **line's extended/total price** (the right-hand amount), not the unit price.
- [ ] **Update the prompt** (AC: 1, 3) — instruct: "Take `quantity` **only from a leading number in the first column** (default 1 if there's no number there). It may be fractional for weight/measure items (e.g. 0.5). Report `price` as the line's **total** for all units (the extended price), not the per-unit price."
- [ ] **Expand in code, integer-≥2 only** (AC: 2, 3, 4, 6, 7) — replace the items `.map(...)` with a `flatMap` that expands a line **only when `Number.isInteger(quantity) && quantity >= 2`**: base unit = `floor(totalCents / quantity)`; distribute the `totalCents % quantity` remainder cents one-per-item to the first *r* items so the sum equals the original total exactly. Each expanded item gets a fresh `crypto.randomUUID()` and the original name. **Everything else — fractional quantity, quantity ≤ 1, missing, or non-numeric — passes through unchanged** as a single full-priced line.
- [ ] **Work in integer cents** (AC: 4, 5) — do the division/remainder in cents to avoid float drift, then convert back; assert `sum(expanded) === round(total*100)/100` and that the overall items sum is **never less** than before (value-preserving).
- [ ] **Tests** (AC: 8) — even split (2 @ $6.00 → 3.00/3.00), uneven (3 @ $10.00 → 3.34/3.33/3.33), **fractional (0.5, 1.5 → unchanged)**, quantity 1 / absent / non-numeric first column (unchanged), and the value-preserving invariant in each. Update the mock-OCR fixture/tests as needed.
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **The total-preservation trap is the whole point** — most receipts print the **extended** (line-total) price at the right. Naively duplicating that price `quantity` times **doubles the bill**. The split must divide the line total by quantity. [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-176-auto-split-quantity-line-items]
- **Expand in code, not in the model** — asking Gemini to emit duplicate lines is less reliable and wastes tokens; have it report `quantity` + extended price, and do the deterministic split + cent reconciliation in the route. [Source: docs/docs/prd/epic-17/epic_17_overview.md#target-approach--technical-notes]
- **Downstream is already fine** — the assignment matrix, `split_among`, and proportional fee math (Epic 7/8) operate on line items, so more items "just work." No DB or client change is required. [Source: app/api/ocr/route.ts]
- **Current shape:** the route returns `items: [{id, name, price}]` after `normalizePrice`; the expansion slots into the existing mapping (lines ~209-217). Keep `normalizePrice` for the incoming value. [Source: app/api/ocr/route.ts]
- **Only whole numbers ≥ 2 split** — quantity comes solely from a leading number in the first column. Fractional/measure quantities (½ lb produce, 0.5, 1.5) and anything without a first-column number stay a single full-priced line; you can't make assignable units from a partial item. When unsure, **don't split** — that guarantees no undercount. [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-176-auto-split-quantity-line-items]
- **Risk is OCR accuracy, not architecture** — whether Gemini reliably reads the quantity column and returns the extended price. Keep `temperature: 0` (already set) for consistency.

### Project Structure Notes

- Modify `app/api/ocr/route.ts` (schema + prompt + expansion). Add/adjust the OCR unit tests and any mock-OCR fixture. No DB change, no client change.

### References

- [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-176-auto-split-quantity-line-items]
- [Source: app/api/ocr/route.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
