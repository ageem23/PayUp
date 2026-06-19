/**
 * @jest-environment node
 */
import {
  minimizeDebts,
  type SettlementTransfer,
} from "@/utils/math/debtMinimizer";

// Apply transfers back onto the balances; everyone should end at 0.
function settles(
  net: Record<string, number>,
  transfers: SettlementTransfer[],
): boolean {
  const bal: Record<string, number> = {};
  Object.keys(net).forEach((k) => (bal[k] = Math.round(net[k] * 100)));
  for (const t of transfers) {
    bal[t.from] = (bal[t.from] ?? 0) + Math.round(t.amount * 100);
    bal[t.to] = (bal[t.to] ?? 0) - Math.round(t.amount * 100);
  }
  return Object.values(bal).every((c) => c === 0);
}

describe("minimizeDebts", () => {
  it("settles a simple one-debtor-one-creditor case", () => {
    const t = minimizeDebts({ A: 10, B: -10 });
    expect(t).toEqual([{ from: "B", to: "A", amount: 10 }]);
  });

  it("collapses a circular chain into a single direct transfer (AC3)", () => {
    // A owes B $10, B owes C $10 → net A:-10, B:0, C:+10 → A pays C $10.
    const t = minimizeDebts({ A: -10, B: 0, C: 10 });
    expect(t).toEqual([{ from: "A", to: "C", amount: 10 }]);
  });

  it("pairs largest debtor with largest creditor", () => {
    // A +20, B -4, C -16 → C pays A 16, then B pays A 4.
    const t = minimizeDebts({ A: 20, B: -4, C: -16 });
    expect(t).toEqual([
      { from: "C", to: "A", amount: 16 },
      { from: "B", to: "A", amount: 4 },
    ]);
    expect(settles({ A: 20, B: -4, C: -16 }, t)).toBe(true);
  });

  it("needs only N/2 transfers for paired balances", () => {
    const net = { A: 10, B: 10, C: -10, D: -10 };
    const t = minimizeDebts(net);
    expect(t).toHaveLength(2);
    expect(settles(net, t)).toBe(true);
  });

  it("returns no transfers when everyone is settled", () => {
    expect(minimizeDebts({ A: 0, B: 0 })).toEqual([]);
    expect(minimizeDebts({})).toEqual([]);
  });

  it("fully settles a messy multi-party ledger with at most N-1 transfers", () => {
    const net = { A: 45.5, B: -20, C: -25.5, D: 0 };
    const t = minimizeDebts(net);
    expect(settles(net, t)).toBe(true);
    // At most (participants with non-zero balance) - 1.
    expect(t.length).toBeLessThanOrEqual(2);
  });

  it("is deterministic across equivalent inputs (tie-break by name)", () => {
    const net = { Zoe: 10, Amy: 10, Bob: -10, Cal: -10 };
    const a = minimizeDebts(net);
    const b = minimizeDebts({ ...net });
    expect(a).toEqual(b);
    expect(settles(net, a)).toBe(true);
  });
});
