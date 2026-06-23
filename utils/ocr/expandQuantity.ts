// Quantity line-item expansion (Epic 17, Story 17.6).
//
// Receipts print the EXTENDED (line-total) price at the right. To let users
// assign individual units to different people, a line with a whole quantity ≥ 2
// is expanded into that many items, splitting the line total — NOT duplicating
// the printed price (which would double the bill). All math is in integer cents
// so the parts sum exactly to the original line total.
//
// Anything else — fractional/measure quantity (0.5, 1.5), quantity ≤ 1, missing,
// or non-numeric — passes through unchanged as a single full-priced item: you
// can't make assignable units from a partial item, and "don't split when unsure"
// guarantees no undercount (value-preserving invariant).

export type ExpandedItem = { name: string; price: number };

// Cap expansion so a bad OCR read (e.g. a huge integer in the quantity column)
// can't generate an enormous array and exhaust request memory/time. Beyond this,
// the line passes through unsplit rather than risk a runaway expansion.
export const MAX_EXPANDABLE_QUANTITY = 200;

export function expandQuantityLine(
  name: string,
  totalPrice: number,
  quantity: number | null | undefined,
): ExpandedItem[] {
  const total = Number.isFinite(totalPrice) && totalPrice > 0 ? totalPrice : 0;

  // Only a whole quantity in [2, MAX] splits; everything else (fractional, ≤1,
  // missing, non-numeric, or implausibly large) stays one full-priced line.
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 2 ||
    quantity > MAX_EXPANDABLE_QUANTITY
  ) {
    return [{ name, price: total }];
  }

  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / quantity);
  const remainder = totalCents - base * quantity; // 0 .. quantity-1 extra cents

  const items: ExpandedItem[] = [];
  for (let i = 0; i < quantity; i++) {
    // Hand the leftover cents to the first `remainder` items so the parts sum
    // back to exactly totalCents.
    const cents = base + (i < remainder ? 1 : 0);
    items.push({ name, price: cents / 100 });
  }
  return items;
}
