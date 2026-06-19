/**
 * @jest-environment node
 */
import {
  calculateProportionalSplit,
  type BillItem,
  type BillSplitAllocation,
} from "@/utils/math/billCalculations";

// Sum a numeric field across all participant shares, in cents, to assert exact
// reconciliation without float noise.
const sumCents = (values: number[]) =>
  values.reduce((acc, v) => acc + Math.round(v * 100), 0);

describe("calculateProportionalSplit", () => {
  it("divides a shared item equally and never drops a penny (the $10/3 + $1 tip case)", () => {
    const items: BillItem[] = [{ id: "i1", price: 10 }];
    const splits: BillSplitAllocation[] = [
      { item_id: "i1", assigned_participants: ["A", "B", "C"] },
    ];

    const result = calculateProportionalSplit(items, splits, ["A", "B", "C"], 0, 1);

    // Subtotals reconcile to exactly $10.00.
    expect(sumCents(result.shares.map((s) => s.subtotal))).toBe(1000);
    // Tip of $1.00 fully distributed — no penny lost or invented.
    expect(sumCents(result.shares.map((s) => s.tipShare))).toBe(100);
    // Grand total balances exactly.
    expect(result.grandTotal).toBeCloseTo(11, 10);
    expect(sumCents(result.shares.map((s) => s.total))).toBe(1100);
    // Highest consumer (the +1¢ subtotal slot) also absorbs the leftover tip ¢.
    expect(result.shares[0].subtotal).toBeCloseTo(3.34, 10);
    expect(result.shares[0].tipShare).toBeCloseTo(0.34, 10);
  });

  it("allocates tax/tip proportionally to each person's subtotal", () => {
    const items: BillItem[] = [
      { id: "i1", price: 30 },
      { id: "i2", price: 10 },
    ];
    const splits: BillSplitAllocation[] = [
      { item_id: "i1", assigned_participants: ["A"] },
      { item_id: "i2", assigned_participants: ["B"] },
    ];

    // A=$30 (75%), B=$10 (25%). Tax $4 → A $3, B $1. Tip $8 → A $6, B $2.
    const result = calculateProportionalSplit(items, splits, ["A", "B"], 4, 8);

    const a = result.shares.find((s) => s.participant === "A")!;
    const b = result.shares.find((s) => s.participant === "B")!;
    expect(a.taxShare).toBeCloseTo(3, 10);
    expect(a.tipShare).toBeCloseTo(6, 10);
    expect(a.total).toBeCloseTo(39, 10);
    expect(b.taxShare).toBeCloseTo(1, 10);
    expect(b.tipShare).toBeCloseTo(2, 10);
    expect(b.total).toBeCloseTo(13, 10);
  });

  it("reconciles awkward proportions exactly (sum of shares === grand total)", () => {
    const items: BillItem[] = [
      { id: "i1", price: 7.33 },
      { id: "i2", price: 5.01 },
      { id: "i3", price: 12.49 },
    ];
    const splits: BillSplitAllocation[] = [
      { item_id: "i1", assigned_participants: ["A", "B"] },
      { item_id: "i2", assigned_participants: ["B", "C"] },
      { item_id: "i3", assigned_participants: ["A", "B", "C"] },
    ];

    const result = calculateProportionalSplit(
      items,
      splits,
      ["A", "B", "C"],
      3.27,
      4.88,
    );

    const grandCents = Math.round(result.grandTotal * 100);
    expect(sumCents(result.shares.map((s) => s.total))).toBe(grandCents);
    expect(sumCents(result.shares.map((s) => s.subtotal))).toBe(
      Math.round(result.subtotal * 100),
    );
    expect(sumCents(result.shares.map((s) => s.taxShare))).toBe(327);
    expect(sumCents(result.shares.map((s) => s.tipShare))).toBe(488);
  });

  it("excludes unassigned items from every subtotal", () => {
    const items: BillItem[] = [
      { id: "i1", price: 20 },
      { id: "i2", price: 99 }, // nobody assigned
    ];
    const splits: BillSplitAllocation[] = [
      { item_id: "i1", assigned_participants: ["A"] },
    ];

    const result = calculateProportionalSplit(items, splits, ["A", "B"], 0, 0);

    expect(result.subtotal).toBeCloseTo(20, 10);
    expect(result.shares.find((s) => s.participant === "A")!.subtotal).toBeCloseTo(
      20,
      10,
    );
    expect(result.shares.find((s) => s.participant === "B")!.subtotal).toBe(0);
  });

  it("splits fees evenly when nothing is assigned (no subtotal to weight by)", () => {
    const result = calculateProportionalSplit([], [], ["A", "B", "C"], 0, 1);

    // $1 tip across 3 with no subtotals → 0.34 / 0.33 / 0.33, summing to $1.
    expect(sumCents(result.shares.map((s) => s.tipShare))).toBe(100);
    expect(result.shares[0].tipShare).toBeCloseTo(0.34, 10);
  });

  it("ignores malformed prices and unknown assignees, and clamps negative fees", () => {
    const items: BillItem[] = [
      { id: "i1", price: Number.NaN },
      { id: "i2", price: -5 },
      { id: "i3", price: 8 },
    ];
    const splits: BillSplitAllocation[] = [
      { item_id: "i3", assigned_participants: ["A", "ghost"] },
    ];

    const result = calculateProportionalSplit(items, splits, ["A"], -10, 2);

    // Only i3 counts; ghost is dropped so A pays the whole $8.
    expect(result.subtotal).toBeCloseTo(8, 10);
    expect(result.shares[0].subtotal).toBeCloseTo(8, 10);
    // Negative tax clamps to 0; tip $2 all to the only participant.
    expect(result.tax).toBe(0);
    expect(result.shares[0].tipShare).toBeCloseTo(2, 10);
    expect(result.shares[0].total).toBeCloseTo(10, 10);
  });
});
