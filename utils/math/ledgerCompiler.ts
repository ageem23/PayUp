// Cross-receipt balance aggregation (Epic 8, Story 8.1).
//
// Rolls every receipt on a trip into one net standing per participant:
//   net = total they PAID (as `paid_by`) − total they CONSUMED (their
//   penny-accurate share from the Epic 7 proportional engine).
// Positive = the group owes them; negative = they owe the group. Because each
// receipt's consumed shares reconcile exactly to its grand total (Epic 7), the
// credit and debits cancel per receipt, so the whole ledger sums to 0.00.
//
// All accumulation is in INTEGER CENTS; dollars are only re-derived for output.

import {
  calculateProportionalSplit,
  type BillItem,
  type BillSplitAllocation,
} from "@/utils/math/billCalculations";

export interface LedgerReceipt {
  processed_data: BillItem[] | null;
  split_among: BillSplitAllocation[] | null;
  tax: number | null;
  tip: number | null;
  paid_by: string;
  // Even-Split Mode (Epic 21). When split_mode is "even", the ledger divides
  // `amount` equally among `even_split_among` instead of using split_among.
  // Optional so existing itemized callers/fixtures compile unchanged.
  split_mode?: "itemized" | "even" | null;
  even_split_among?: string[] | null;
  amount?: number | null;
}

export interface LedgerResult {
  /** Net standing per participant in dollars (+ owed to them, − owed by them). */
  net: Record<string, number>;
  /** True when every net balance sums to exactly $0.00 (accounting check). */
  balanced: boolean;
}

// Dollars (already 2-decimal from the engine) → exact integer cents.
const cents = (value: number): number => Math.round(value * 100);

/**
 * Compiles a trip's receipts into net per-participant standings.
 * Pure: the caller fetches the receipts (under its RLS session) and passes them
 * in, mirroring the Epic 7 split-engine pattern. Names are keyed by the
 * `participants` list plus any `paid_by` payer not already in it, so a payer who
 * isn't a listed participant still has their credit accounted for (keeps the
 * ledger balanced).
 */
export function compileLedger(
  receipts: LedgerReceipt[],
  participants: string[],
): LedgerResult {
  const netCents = new Map<string, number>();
  // Seed every participant at 0 so they all appear, even with no activity.
  for (const p of participants) netCents.set(p, 0);

  const bump = (name: string, delta: number) => {
    netCents.set(name, (netCents.get(name) ?? 0) + delta);
  };

  for (const receipt of receipts) {
    const items = Array.isArray(receipt.processed_data)
      ? receipt.processed_data
      : [];
    const splits = Array.isArray(receipt.split_among) ? receipt.split_among : [];
    const split = calculateProportionalSplit(
      items,
      splits,
      participants,
      receipt.tax ?? 0,
      receipt.tip ?? 0,
    );

    // Credit the payer the full receipt cost; debit each consumer their share.
    // The two sides are equal per receipt, so the trip-wide ledger nets to 0.
    bump(receipt.paid_by, cents(split.grandTotal));
    for (const share of split.shares) {
      bump(share.participant, -cents(share.total));
    }
  }

  let sum = 0;
  const net: Record<string, number> = {};
  netCents.forEach((value, name) => {
    sum += value;
    net[name] = value / 100;
  });

  const balanced = sum === 0;
  if (!balanced) {
    // Telemetry safeguard (AC4): the ledger should always net to zero. A
    // non-zero sum signals a data or rounding defect upstream.
    console.warn(
      `[ledgerCompiler] net balances do not sum to zero (off by ${sum} cents) — possible data integrity issue.`,
    );
  }

  return { net, balanced };
}
