/**
 * @jest-environment node
 */
import {
  expandQuantityLine,
  MAX_EXPANDABLE_QUANTITY,
} from "@/utils/ocr/expandQuantity";

const sumCents = (items: { price: number }[]) =>
  items.reduce((acc, item) => acc + Math.round(item.price * 100), 0);

describe("expandQuantityLine", () => {
  it("splits an even quantity (2 @ $6.00 -> 3.00 / 3.00)", () => {
    const items = expandQuantityLine("Burger", 6, 2);
    expect(items.map((i) => i.price)).toEqual([3, 3]);
    expect(items.every((i) => i.name === "Burger")).toBe(true);
    expect(sumCents(items)).toBe(600); // value-preserving
  });

  it("distributes the leftover cent on an uneven split (3 @ $10.00 -> 3.34 / 3.33 / 3.33)", () => {
    const items = expandQuantityLine("Taco", 10, 3);
    expect(items.map((i) => i.price)).toEqual([3.34, 3.33, 3.33]);
    expect(sumCents(items)).toBe(1000); // value-preserving
  });

  it("does NOT split fractional / measure quantities (0.5, 1.5) — unchanged", () => {
    expect(expandQuantityLine("Grapes", 4.5, 0.5)).toEqual([
      { name: "Grapes", price: 4.5 },
    ]);
    expect(expandQuantityLine("Deli ham", 7.2, 1.5)).toEqual([
      { name: "Deli ham", price: 7.2 },
    ]);
  });

  it("does NOT split quantity 1, missing, or non-numeric — single full-priced item", () => {
    expect(expandQuantityLine("Soda", 2.5, 1)).toEqual([
      { name: "Soda", price: 2.5 },
    ]);
    expect(expandQuantityLine("Soda", 2.5, null)).toEqual([
      { name: "Soda", price: 2.5 },
    ]);
    expect(expandQuantityLine("Soda", 2.5, undefined)).toEqual([
      { name: "Soda", price: 2.5 },
    ]);
  });

  it("does NOT split an implausibly large quantity (caps runaway expansion)", () => {
    expect(expandQuantityLine("Bad OCR", 12, MAX_EXPANDABLE_QUANTITY + 1)).toEqual(
      [{ name: "Bad OCR", price: 12 }],
    );
    expect(expandQuantityLine("Bad OCR", 12, 100000)).toEqual([
      { name: "Bad OCR", price: 12 },
    ]);
    // The cap boundary itself still splits.
    expect(expandQuantityLine("X", 10, MAX_EXPANDABLE_QUANTITY)).toHaveLength(
      MAX_EXPANDABLE_QUANTITY,
    );
  });

  it("is value-preserving — the parts always sum to the original line total", () => {
    const cases: ReadonlyArray<readonly [number, number]> = [
      [6, 2],
      [10, 3],
      [9.99, 4],
      [100, 7],
    ];
    for (const [total, qty] of cases) {
      expect(sumCents(expandQuantityLine("X", total, qty))).toBe(
        Math.round(total * 100),
      );
    }
  });
});
