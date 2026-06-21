import { supabase } from "@/utils/supabase/client";
import type { LineItem } from "@/components/feature/MatrixStateWrapper";

// Shared no-op-write guard: Supabase returns error: null even when zero rows
// match (stale id / RLS denial), so treat that as a failure.
function assertAffected<T>(data: T[] | null, what: string): T[] {
  if (!data || data.length === 0) {
    throw new Error(
      `Receipt ${what} update affected no rows (check the receipt id or permissions).`,
    );
  }
  return data;
}

/**
 * Persists the full processed_data (line items) array for a receipt in one
 * atomic update. Callers pass the COMPLETE array — processed_data is one JSONB
 * column, so a partial array would drop omitted lines (Story 13.6).
 */
export async function patchReceiptItems(receiptId: string, items: LineItem[]) {
  const { data, error } = await supabase
    .from("receipts")
    .update({ processed_data: items })
    .eq("id", receiptId)
    .select("id");
  if (error) throw error;
  return assertAffected(data, "items");
}

/** Persists a receipt's display name (Story 13.6). */
export async function patchReceiptName(receiptId: string, name: string) {
  const { data, error } = await supabase
    .from("receipts")
    .update({ name })
    .eq("id", receiptId)
    .select("id");
  if (error) throw error;
  return assertAffected(data, "name");
}
