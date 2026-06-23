import { supabase } from "@/utils/supabase/client";

export const DISPLAY_NAME_MAX = 60;

const AVATARS_BUCKET = "avatars";
const ACCEPTED_AVATAR_EXT = ["jpg", "jpeg", "png"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

export type Profile = {
  displayName: string | null;
  avatarUrl: string | null;
  theme: string | null;
  accentColor: string | null;
};

/**
 * Reads the current user's profile (Story 15.2/15.3). Returns null when signed
 * out or on any error, so callers fail safe (fall back to the email). The
 * profile row is auto-created by the auth.users trigger / backfill in 0012.
 */
export async function fetchProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, theme, accent_color")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return null;

  return {
    displayName: (data?.display_name as string | null) ?? null,
    avatarUrl: (data?.avatar_url as string | null) ?? null,
    theme: (data?.theme as string | null) ?? null,
    accentColor: (data?.accent_color as string | null) ?? null,
  };
}

/**
 * Persists theme / accent-color preferences to the profile (Story 15.4).
 * Best-effort: signed-out users are a no-op (preferences stay cached in
 * localStorage), and a write error is logged but never thrown — the UI has
 * already applied + cached the change.
 */
export async function savePreferences(patch: {
  theme?: string;
  accentColor?: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const row: Record<string, unknown> = { user_id: user.id };
  if (patch.theme !== undefined) row.theme = patch.theme;
  if (patch.accentColor !== undefined) row.accent_color = patch.accentColor;

  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" });
  if (error) {
    console.warn(`[profile] savePreferences failed: ${error.message}`);
  }
}

/**
 * Uploads a new avatar for the current user (Story 15.3) into their own folder
 * (`avatars/{user_id}/…`, enforced by the storage RLS in 0013). Removes any
 * prior avatar objects first so they don't accumulate (AC5), then persists the
 * cache-busted public URL onto the profile. Validates type/size client-side.
 */
export type UploadAvatarResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function uploadAvatar(file: File): Promise<UploadAvatarResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_AVATAR_EXT.includes(ext)) {
    return { ok: false, error: "Please upload a JPG or PNG image." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Image must be under 5 MB." };
  }

  const folder = user.id;
  // Clear any existing avatar object(s) so a different extension can't orphan
  // the old file (AC5).
  const { data: existing } = await supabase.storage
    .from(AVATARS_BUCKET)
    .list(folder);
  if (existing && existing.length > 0) {
    await supabase.storage
      .from(AVATARS_BUCKET)
      .remove(existing.map((object) => `${folder}/${object.name}`));
  }

  const path = `${folder}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  // Cache-bust so the <img> refreshes after a same-path replace.
  const url = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, avatar_url: url }, { onConflict: "user_id" });
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true, url };
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
