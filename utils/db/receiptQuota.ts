import { supabase } from "@/utils/supabase/client";

export type ReceiptQuota = {
  isUnlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
  /** ISO timestamp when the next slot frees (rolling window), null if not at cap. */
  nextAvailableAt: string | null;
};

type QuotaRow = {
  is_unlimited?: boolean;
  used?: number;
  limit?: number;
  remaining?: number;
  next_available_at?: string | null;
};

/**
 * Reads the caller's receipt-quota status from the server (Story 14.4), via the
 * `receipt_quota_status()` SECURITY DEFINER function (Story 14.2). The server is
 * the source of truth — this is display-only. Returns null on any error so the
 * UI fails safe (no counter shown, server trigger still enforces the cap).
 */
export async function fetchReceiptQuota(): Promise<ReceiptQuota | null> {
  const { data, error } = await supabase.rpc("receipt_quota_status");
  if (error) return null;
  // The function returns a single-row TABLE; supabase surfaces it as an array.
  const row: QuotaRow | undefined = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    isUnlimited: !!row.is_unlimited,
    used: Number(row.used ?? 0),
    limit: Number(row.limit ?? 3),
    remaining: Number(row.remaining ?? 0),
    nextAvailableAt: row.next_available_at ?? null,
  };
}
