/**
 * @jest-environment node
 */
import {
  ACCENT_COLORS,
  DEFAULT_ACCENT,
  accentClass,
  isAccentToken,
} from "@/utils/profile/accentColors";

describe("accentColors", () => {
  it("validates allow-listed tokens and rejects everything else", () => {
    expect(isAccentToken("indigo")).toBe(true);
    expect(isAccentToken("rose")).toBe(true);
    expect(isAccentToken("chartreuse")).toBe(false);
    expect(isAccentToken("")).toBe(false);
    expect(isAccentToken(null)).toBe(false);
    expect(isAccentToken(123)).toBe(false);
  });

  it("maps each token to its literal accent class", () => {
    for (const color of ACCENT_COLORS) {
      expect(accentClass(color.token)).toBe(color.accent);
      // Class strings must be literal so Tailwind's JIT keeps them.
      expect(color.accent).toMatch(/^accent-[a-z]+-\d{3}$/);
    }
  });

  it("falls back to the default token's class for an unknown token", () => {
    // @ts-expect-error — exercising the runtime fallback with a bad value.
    expect(accentClass("nope")).toBe(accentClass(DEFAULT_ACCENT));
  });
});
