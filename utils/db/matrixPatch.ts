import { supabase } from "@/utils/supabase/client";

export interface ReceiptSplitAllocation {
  item_id: string;
  assigned_participants: string[];
}

/**
 * Persists the full split_among allocation array for a receipt in a single
 * atomic update. Callers must pass the COMPLETE array (with unrelated items
 * preserved) — split_among is one JSONB column, so a partial array would drop
 * the omitted lines. An item with no assignees stays as `assigned_participants: []`
 * (never null).
 */
export async function patchReceiptSplits(
  receiptId: string,
  payload: ReceiptSplitAllocation[],
) {
  const { data, error } = await supabase
    .from("receipts")
    .update({ split_among: payload })
    .eq("id", receiptId)
    .select();

  if (error) {
    throw error;
  }
  return data;
}
