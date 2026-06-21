/**
 * @jest-environment node
 */
import { defaultTipFromItems, DEFAULT_TIP_RATE } from "@/utils/math/defaultTip";

describe("defaultTipFromItems", () => {
  it("is 20% of the pre-tax subtotal", () => {
    expect(DEFAULT_TIP_RATE).toBe(0.2);
    // (10 + 15 + 25) * 0.2 = 10.00
    expect(
      defaultTipFromItems([{ price: 10 }, { price: 15 }, { price: 25 }]),
    ).toBe(10);
  });

  it("rounds to the nearest cent", () => {
    // 19.99 * 0.2 = 3.998 -> 4.00
    expect(defaultTipFromItems([{ price: 19.99 }])).toBe(4);
    // 4.05 * 0.2 = 0.81
    expect(defaultTipFromItems([{ price: 4.05 }])).toBe(0.81);
  });

  it("returns 0 for an empty or zero-subtotal receipt", () => {
    expect(defaultTipFromItems([])).toBe(0);
    expect(defaultTipFromItems([{ price: 0 }])).toBe(0);
  });

  it("ignores non-finite/missing prices defensively", () => {
    expect(
      defaultTipFromItems([
        { price: 10 },
        { price: NaN as unknown as number },
        { price: undefined as unknown as number },
      ]),
    ).toBe(2);
  });
});
