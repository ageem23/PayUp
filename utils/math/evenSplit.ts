// Even-Split Mode cent division (Epic 21). Shared by the settle-up ledger
// (Story 21.2) and the UI per-person readout (Story 21.3) so they always agree.

/**
 * Splits a total (in INTEGER CENTS) into `n` cent-exact equal parts. The base is
 * `floor(total / n)`; the leftover cents (`total mod n`) are handed one each to
 * the first parts, so the returned parts sum back to exactly `totalCents`. Returns
 * `[]` for `n <= 0`.
 */
export function splitCentsEvenly(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n; // 0 .. n-1
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}
