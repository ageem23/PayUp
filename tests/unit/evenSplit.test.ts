/**
 * @jest-environment node
 */
import { splitCentsEvenly } from "@/utils/math/evenSplit";
import { compileLedger, type LedgerReceipt } from "@/utils/math/ledgerCompiler";

describe("splitCentsEvenly", () => {
  it("divides evenly when it divides cleanly", () => {
    expect(splitCentsEvenly(3000, 3)).toEqual([1000, 1000, 1000]);
  });

  it("distributes leftover cents to the first parts and sums to the total", () => {
    expect(splitCentsEvenly(1000, 3)).toEqual([334, 333, 333]);
    expect(splitCentsEvenly(1000, 3).reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("handles a single participant and n <= 0", () => {
    expect(splitCentsEvenly(1500, 1)).toEqual([1500]);
    expect(splitCentsEvenly(1500, 0)).toEqual([]);
  });
});

const even = (over: Partial<LedgerReceipt>): LedgerReceipt => ({
  processed_data: null,
  split_among: null,
  tax: null,
  tip: null,
  paid_by: "Alice",
  split_mode: "even",
  even_split_among: [],
  amount: 0,
  ...over,
});

describe("compileLedger — even-split mode", () => {
  it("divides the total equally; payer credited, selected debited; balanced", () => {
    const r = even({ amount: 30, even_split_among: ["Alice", "Bob", "Carol"] });
    const { net, balanced } = compileLedger([r], ["Alice", "Bob", "Carol"]);
    expect(balanced).toBe(true);
    expect(net.Alice).toBeCloseTo(20, 2); // +30 paid − 10 share
    expect(net.Bob).toBeCloseTo(-10, 2);
    expect(net.Carol).toBeCloseTo(-10, 2);
  });

  it("is cent-exact on an indivisible total (still balanced)", () => {
    const r = even({ amount: 10, even_split_among: ["Alice", "Bob", "Carol"] });
    const { net, balanced } = compileLedger([r], ["Alice", "Bob", "Carol"]);
    expect(balanced).toBe(true);
    expect(net.Alice).toBeCloseTo(6.66, 2); // +10 − 3.34
    expect(net.Bob).toBeCloseTo(-3.33, 2);
    expect(net.Carol).toBeCloseTo(-3.33, 2);
  });

  it("works on an itemless receipt (total from amount, no items)", () => {
    const r = even({ amount: 50, even_split_among: ["Bob", "Carol"] });
    const { net, balanced } = compileLedger([r], ["Alice", "Bob", "Carol"]);
    expect(balanced).toBe(true);
    expect(net.Alice).toBeCloseTo(50, 2);
    expect(net.Bob).toBeCloseTo(-25, 2);
    expect(net.Carol).toBeCloseTo(-25, 2);
  });

  it("contributes nothing when nobody is selected (stays balanced)", () => {
    const r = even({ amount: 20, even_split_among: [] });
    const { net, balanced } = compileLedger([r], ["Alice", "Bob"]);
    expect(balanced).toBe(true);
    expect(net.Alice).toBe(0);
    expect(net.Bob).toBe(0);
  });

  it("handles a single selected participant", () => {
    const r = even({ amount: 15, even_split_among: ["Bob"] });
    const { net, balanced } = compileLedger([r], ["Alice", "Bob"]);
    expect(balanced).toBe(true);
    expect(net.Alice).toBeCloseTo(15, 2);
    expect(net.Bob).toBeCloseTo(-15, 2);
  });

  it("dedupes and drops names that are no longer participants", () => {
    // "Bob" duplicated + "Zoe" not on the roster → effective split is Alice+Bob.
    const r = even({
      amount: 20,
      even_split_among: ["Alice", "Bob", "Bob", "Zoe"],
    });
    const { net, balanced } = compileLedger([r], ["Alice", "Bob"]);
    expect(balanced).toBe(true);
    expect(net.Alice).toBeCloseTo(10, 2); // paid 20, owes 10 (1 of 2 valid)
    expect(net.Bob).toBeCloseTo(-10, 2); // charged once, not twice
    expect(net.Zoe ?? 0).toBe(0); // phantom name never debited
  });
});
