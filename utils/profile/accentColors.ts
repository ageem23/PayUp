// Accent-color profile palette (Epic 9, Story 9.2).
//
// A fixed, allow-listed set of high-contrast accents. The full Tailwind class
// strings are written out literally so the JIT compiler keeps them — never
// build an `accent-${token}` string dynamically, that would get purged.

export const ACCENT_COLORS = [
  { token: "indigo", label: "Indigo", swatch: "bg-indigo-600", accent: "accent-indigo-600" },
  { token: "emerald", label: "Emerald", swatch: "bg-emerald-600", accent: "accent-emerald-600" },
  { token: "rose", label: "Rose", swatch: "bg-rose-600", accent: "accent-rose-600" },
  { token: "amber", label: "Amber", swatch: "bg-amber-500", accent: "accent-amber-500" },
  { token: "cyan", label: "Cyan", swatch: "bg-cyan-600", accent: "accent-cyan-600" },
] as const;

export type AccentToken = (typeof ACCENT_COLORS)[number]["token"];

export const DEFAULT_ACCENT: AccentToken = "indigo";

const BY_TOKEN = Object.fromEntries(
  ACCENT_COLORS.map((c) => [c.token, c]),
) as Record<AccentToken, (typeof ACCENT_COLORS)[number]>;

/** Validates an arbitrary string against the allow-list. Uses own-key checks so
 *  inherited keys like "toString"/"constructor" can't pass. */
export function isAccentToken(value: unknown): value is AccentToken {
  return typeof value === "string" && Object.hasOwn(BY_TOKEN, value);
}

/** The `accent-*` checkbox class for a token (falls back to the default). */
export function accentClass(token: AccentToken): string {
  return Object.hasOwn(BY_TOKEN, token)
    ? BY_TOKEN[token].accent
    : BY_TOKEN[DEFAULT_ACCENT].accent;
}
