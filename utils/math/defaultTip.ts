// Default tip heuristic (Epic 13, Story 13.5).
//
// When a receipt has no printed tip line, we prefill a sensible default of 20%
// of the PRE-TAX subtotal (sum of line-item prices), rounded to the cent — US
// tipping etiquette tips on the subtotal, not the tax-inclusive total.

/** Fraction of the pre-tax subtotal used as the default tip. */
export const DEFAULT_TIP_RATE = 0.2;

/**
 * 20% of the pre-tax subtotal (sum of line-item prices), rounded to the nearest
 * cent. Returns 0 for an empty/zero-subtotal receipt. Pure and side-effect free.
 */
export function defaultTipFromItems(items: { price: number }[]): number {
  const subtotal = items.reduce(
    // Guard malformed jsonb prices (NaN / missing) so one bad line can't poison
    // the whole subtotal.
    (sum, item) => sum + (Number.isFinite(item?.price) ? item.price : 0),
    0,
  );
  if (!(subtotal > 0)) return 0;
  return Math.round(subtotal * DEFAULT_TIP_RATE * 100) / 100;
}
