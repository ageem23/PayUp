import { supabase } from "@/utils/supabase/client";

export interface ReceiptFees {
  tax: number;
  tip: number;
}

/**
 * Persists the global tax/tip fee overrides for a receipt. Both values are
 * written together so the row always reflects the latest entry. Values are
 * clamped to be non-negative and finite before the write — the DB also enforces
 * a `>= 0` check, but failing fast here keeps a bad number off the wire.
 */
export async function patchReceiptFees(
  receiptId: string,
  fees: ReceiptFees,
): Promise<void> {
  const sanitize = (value: number): number =>
    Number.isFinite(value) && value > 0 ? value : 0;

  const { data, error } = await supabase
    .from("receipts")
    .update({ tax: sanitize(fees.tax), tip: sanitize(fees.tip) })
    .eq("id", receiptId)
    .select("id");

  if (error) {
    throw error;
  }
  // Supabase returns error: null even when zero rows match (stale id / RLS
  // denial) — treat a no-op write as a failure so it isn't silently "saved".
  if (!data || data.length === 0) {
    throw new Error(
      "Receipt fee update affected no rows (check the receipt id or permissions).",
    );
  }
}
