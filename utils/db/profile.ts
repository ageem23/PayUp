import { supabase } from "@/utils/supabase/client";

export const DISPLAY_NAME_MAX = 60;

export type Profile = {
  displayName: string | null;
};

/**
 * Reads the current user's profile (Story 15.2). Returns null when signed out or
 * on any error, so callers fail safe (fall back to the email). The profile row
 * is auto-created by the auth.users trigger / backfill in migration 0012.
 */
export async function fetchProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return null;

  return { displayName: (data?.display_name as string | null) ?? null };
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Persists the current user's display name. Trims, caps at DISPLAY_NAME_MAX, and
 * normalizes a blank value to null so the UI falls back to the email (AC6).
 * Upsert (not update) so a missing row — e.g. a user created before 0012 was
 * applied — is created rather than silently affecting zero rows.
 */
export async function updateDisplayName(input: string): Promise<SaveResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const trimmed = input.trim().slice(0, DISPLAY_NAME_MAX);
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, display_name: trimmed || null },
      { onConflict: "user_id" },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
