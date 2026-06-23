import { supabase } from "@/utils/supabase/client";

export type SetParticipantsResult = { ok: true } | { ok: false; error: string };

/**
 * Persists a trip's participant name list (Story 17.4) via the
 * `set_trip_participants` SECURITY DEFINER RPC (migration 0016), which authorizes
 * the trip owner or an approved member and writes ONLY the participants column.
 */
export async function setTripParticipants(
  tripId: string,
  names: string[],
): Promise<SetParticipantsResult> {
  const { error } = await supabase.rpc("set_trip_participants", {
    p_trip_id: tripId,
    p_names: names,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
