// Minimized cash-flow debt-graph engine (Epic 8, Story 8.2).
//
// Turns net per-participant standings (from the ledger compiler) into the
// fewest peer-to-peer transfers that square everyone up. Greedy cash-flow
// minimization: each round settle the largest debtor against the largest
// creditor. This collapses chains (A→B→C becomes A→C) and zeroes at least one
// party per transfer, so the transfer count stays near-minimal.
//
// All matching is done in INTEGER CENTS so residual fractional debts can't
// linger; amounts are converted back to dollars only on output.

export interface SettlementTransfer {
  from: string;
  to: string;
  amount: number;
}

interface Standing {
  name: string;
  cents: number;
}

const toCents = (value: number): number =>
  Number.isFinite(value) ? Math.round(value * 100) : 0;

// Pick the still-active standing with the most extreme balance. `sign > 0`
// finds the largest creditor; `sign < 0` the largest debtor. Name breaks ties
// so the same input always yields identical instructions.
function pickExtreme(standings: Standing[], sign: number): Standing | null {
  let best: Standing | null = null;
  for (const s of standings) {
    if (sign > 0 ? s.cents <= 0 : s.cents >= 0) continue;
    if (
      best === null ||
      Math.abs(s.cents) > Math.abs(best.cents) ||
      // Locale-independent code-unit compare: `localeCompare` without an
      // explicit locale is implementation-defined and would make tie-breaks
      // vary across runtimes, breaking the determinism guarantee.
      (Math.abs(s.cents) === Math.abs(best.cents) && s.name < best.name)
    ) {
      best = s;
    }
  }
  return best;
}

/**
 * Computes the minimal set of transfers to settle a group from their net
 * balances (positive = owed money, negative = owes money). Deterministic.
 */
export function minimizeDebts(
  netBalances: Record<string, number>,
): SettlementTransfer[] {
  const standings: Standing[] = Object.keys(netBalances)
    .map((name) => ({ name, cents: toCents(netBalances[name]) }))
    .filter((s) => s.cents !== 0);

  const transfers: SettlementTransfer[] = [];

  // Bounded by the participant count: each round zeroes at least one party.
  while (true) {
    const creditor = pickExtreme(standings, 1);
    const debtor = pickExtreme(standings, -1);
    if (!creditor || !debtor) break;

    const amount = Math.min(creditor.cents, -debtor.cents);
    if (amount <= 0) break;

    transfers.push({ from: debtor.name, to: creditor.name, amount: amount / 100 });
    creditor.cents -= amount;
    debtor.cents += amount;
  }

  return transfers;
}
