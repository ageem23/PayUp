// Precision proportional-split engine (Epic 7, Story 7.2).
//
// All money is reduced to INTEGER CENTS for every intermediate step, so no
// fractional-cent float drift can accumulate. Two independent rounding sources
// are reconciled exactly so the ledger never leaks or invents a penny:
//   1. Per-item equal division among assignees (e.g. $10.00 / 3).
//   2. Proportional tax/tip allocation by each person's subtotal share.
// Each distribution hands its leftover cents out one at a time by largest
// fractional remainder, with ties broken toward the highest consumer — a
// deterministic rule that always sums back to the exact input (AC3, AC4).

export interface BillItem {
  id: string;
  price: number;
}

export interface BillSplitAllocation {
  item_id: string;
  assigned_participants: string[];
}

export interface ParticipantShare {
  participant: string;
  subtotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
}

export interface ProportionalSplitResult {
  shares: ParticipantShare[];
  subtotal: number;
  tax: number;
  tip: number;
  grandTotal: number;
}

// Dollars → non-negative integer cents. Guards NaN/Infinity/negatives → 0.
function toCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

/**
 * Splits `amountCents` across `weights` so the parts sum EXACTLY to the input.
 * Each slot gets floor(amount * weight / totalWeight); the leftover cents are
 * handed out one per slot, ordered by largest fractional remainder, then by
 * largest weight (the "highest consumer"), then by original index — fully
 * deterministic. When every weight is 0 the amount is spread as evenly as
 * possible instead (so fees never vanish when nothing is assigned).
 */
function distributeByWeight(amountCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0 || amountCents <= 0) return new Array(n).fill(0);

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const effectiveWeights = totalWeight > 0 ? weights : new Array(n).fill(1);
  const effectiveTotal = totalWeight > 0 ? totalWeight : n;

  const base: number[] = [];
  const remainders: { index: number; frac: number; weight: number }[] = [];
  let allocated = 0;

  for (let i = 0; i < n; i++) {
    const exact = (amountCents * effectiveWeights[i]) / effectiveTotal;
    const floored = Math.floor(exact);
    base[i] = floored;
    allocated += floored;
    remainders.push({ index: i, frac: exact - floored, weight: effectiveWeights[i] });
  }

  let leftover = amountCents - allocated;
  remainders.sort(
    (a, b) =>
      b.frac - a.frac || b.weight - a.weight || a.index - b.index,
  );
  for (let i = 0; i < remainders.length && leftover > 0; i++) {
    base[remainders[i].index] += 1;
    leftover -= 1;
  }
  return base;
}

/**
 * Computes each participant's fair share of an itemized receipt: their base
 * subtotal (shared items divided equally), plus tax and tip scaled to their
 * proportion of the total assigned subtotal. Returns dollar amounts; every
 * column reconciles exactly to the global totals.
 */
export function calculateProportionalSplit(
  items: BillItem[],
  splitAmong: BillSplitAllocation[],
  participants: string[],
  globalTax: number,
  globalTip: number,
): ProportionalSplitResult {
  // Stable participant index for deterministic ordering and O(1) lookup.
  const order = new Map<string, number>();
  participants.forEach((p, i) => order.set(p, i));

  const subtotalCents = new Array(participants.length).fill(0);

  const splitByItem = new Map<string, string[]>();
  for (const alloc of splitAmong) {
    splitByItem.set(alloc.item_id, alloc.assigned_participants);
  }

  for (const item of items) {
    const priceCents = toCents(item.price);
    if (priceCents === 0) continue;

    // Only count assignees that are real, known participants; dedupe; keep
    // them in participant order so the per-item leftover penny is deterministic.
    const raw = splitByItem.get(item.id) ?? [];
    const assignees = Array.from(new Set(raw))
      .filter((p) => order.has(p))
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    if (assignees.length === 0) continue; // unassigned item: nobody pays

    // Equal split with the remainder cents going to the earliest assignees.
    const portions = distributeByWeight(
      priceCents,
      new Array(assignees.length).fill(1),
    );
    assignees.forEach((p, i) => {
      subtotalCents[order.get(p) as number] += portions[i];
    });
  }

  const taxCents = toCents(globalTax);
  const tipCents = toCents(globalTip);
  const taxShares = distributeByWeight(taxCents, subtotalCents);
  const tipShares = distributeByWeight(tipCents, subtotalCents);

  const shares: ParticipantShare[] = participants.map((participant, i) => {
    const subtotal = subtotalCents[i];
    const tax = taxShares[i];
    const tip = tipShares[i];
    return {
      participant,
      subtotal: subtotal / 100,
      taxShare: tax / 100,
      tipShare: tip / 100,
      total: (subtotal + tax + tip) / 100,
    };
  });

  const subtotalTotal = subtotalCents.reduce((sum, c) => sum + c, 0);

  return {
    shares,
    subtotal: subtotalTotal / 100,
    tax: taxCents / 100,
    tip: tipCents / 100,
    grandTotal: (subtotalTotal + taxCents + tipCents) / 100,
  };
}
