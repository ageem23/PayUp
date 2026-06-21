import { supabase } from "@/utils/supabase/client";

const BUCKET = "receipt-images";

/**
 * Extract the storage object path from a Supabase public URL, or null if the
 * URL isn't a `receipt-images` public URL. Public URLs look like
 * `.../storage/v1/object/public/receipt-images/<file>`.
 */
export function storagePathFromPublicUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const marker = `/${BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = imageUrl.slice(idx + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/**
 * Deletes a receipt and cleans up its stored image.
 *
 * The row delete goes first because it is the authoritative, access-controlled
 * action: receipts RLS (`for all`) authorizes the trip owner and approved
 * members only, so a non-member's delete is denied server-side and aborts
 * before the image is touched. Image removal is best-effort — once the row is
 * gone a storage hiccup shouldn't surface as a failure, it just leaves an
 * orphan blob.
 */
export async function deleteReceipt(
  receiptId: string,
  imageUrl: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", receiptId)
    .select("id");

  if (error) {
    throw error;
  }
  // Supabase returns error: null even when zero rows match (stale id / RLS
  // denial) — treat a no-op delete as a failure so the UI doesn't claim success.
  if (!data || data.length === 0) {
    throw new Error(
      "Receipt delete affected no rows (check the receipt id or permissions).",
    );
  }

  const path = storagePathFromPublicUrl(imageUrl);
  if (path) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (removeError) {
      // Non-fatal: the receipt is already gone; log for cleanup visibility.
      console.warn(
        `[deleteReceipt] image cleanup failed for ${path}: ${removeError.message}`,
      );
    }
  }
}
