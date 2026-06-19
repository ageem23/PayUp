/**
 * @jest-environment node
 */
import { compileLedger, type LedgerReceipt } from "@/utils/math/ledgerCompiler";

const r = (over: Partial<LedgerReceipt>): LedgerReceipt => ({
  processed_data: [],
  split_among: [],
  tax: 0,
  tip: 0,
  paid_by: "A",
  ...over,
});

const sumCents = (net: Record<string, number>) =>
  Object.values(net).reduce((acc, v) => acc + Math.round(v * 100), 0);

describe("compileLedger", () => {
  it("nets paid credit against consumed debt for a single shared receipt", () => {
    const receipts = [
      r({
        processed_data: [{ id: "i1", price: 30 }],
        split_among: [{ item_id: "i1", assigned_participants: ["A", "B", "C"] }],
        paid_by: "A",
      }),
    ];

    const { net, balanced } = compileLedger(receipts, ["A", "B", "C"]);

    expect(net.A).toBeCloseTo(20, 10); // paid 30, consumed 10
    expect(net.B).toBeCloseTo(-10, 10);
    expect(net.C).toBeCloseTo(-10, 10);
    expect(balanced).toBe(true);
    expect(sumCents(net)).toBe(0);
  });

  it("aggregates across multiple receipts with different payers", () => {
    const receipts = [
      r({
        processed_data: [{ id: "i1", price: 30 }],
        split_among: [{ item_id: "i1", assigned_participants: ["A", "B", "C"] }],
        paid_by: "A",
      }),
      r({
        processed_data: [{ id: "i2", price: 12 }],
        split_among: [{ item_id: "i2", assigned_participants: ["B", "C"] }],
        paid_by: "B",
      }),
    ];

    // Receipt 1: A +20, B -10, C -10.
    // Receipt 2: B paid 12, B & C consume 6 each → B +6, C -6.
    // Totals: A +20, B -4, C -16.
    const { net, balanced } = compileLedger(receipts, ["A", "B", "C"]);

    expect(net.A).toBeCloseTo(20, 10);
    expect(net.B).toBeCloseTo(-4, 10);
    expect(net.C).toBeCloseTo(-16, 10);
    expect(balanced).toBe(true);
    expect(sumCents(net)).toBe(0);
  });

  it("includes tax/tip in the consumed shares and still balances", () => {
    const receipts = [
      r({
        processed_data: [{ id: "i1", price: 40 }],
        split_among: [{ item_id: "i1", assigned_participants: ["A", "B"] }],
        tax: 4,
        tip: 6,
        paid_by: "A",
      }),
    ];

    // Grand total 50, split evenly: each consumes 25. A paid 50 → A +25, B -25.
    const { net, balanced } = compileLedger(receipts, ["A", "B"]);

    expect(net.A).toBeCloseTo(25, 10);
    expect(net.B).toBeCloseTo(-25, 10);
    expect(balanced).toBe(true);
  });

  it("accounts for a payer who is not in the participant list (still balances)", () => {
    const receipts = [
      r({
        processed_data: [{ id: "i1", price: 20 }],
        split_among: [{ item_id: "i1", assigned_participants: ["A", "B"] }],
        paid_by: "Dave",
      }),
    ];

    const { net, balanced } = compileLedger(receipts, ["A", "B"]);

    expect(net.Dave).toBeCloseTo(20, 10);
    expect(net.A).toBeCloseTo(-10, 10);
    expect(net.B).toBeCloseTo(-10, 10);
    expect(balanced).toBe(true);
    expect(sumCents(net)).toBe(0);
  });

  it("sums to exactly zero even with awkward fractional proportions", () => {
    const receipts = [
      r({
        processed_data: [
          { id: "i1", price: 10 },
          { id: "i2", price: 7.33 },
        ],
        split_among: [
          { item_id: "i1", assigned_participants: ["A", "B", "C"] },
          { item_id: "i2", assigned_participants: ["A", "C"] },
        ],
        tax: 1.99,
        tip: 3.01,
        paid_by: "C",
      }),
      r({
        processed_data: [{ id: "i3", price: 13.37 }],
        split_among: [{ item_id: "i3", assigned_participants: ["A", "B"] }],
        tip: 2.5,
        paid_by: "B",
      }),
    ];

    const { net, balanced } = compileLedger(receipts, ["A", "B", "C"]);

    expect(balanced).toBe(true);
    expect(sumCents(net)).toBe(0);
  });

  it("returns all-zero balances for a trip with no receipts", () => {
    const { net, balanced } = compileLedger([], ["A", "B"]);

    expect(net).toEqual({ A: 0, B: 0 });
    expect(balanced).toBe(true);
  });
});
