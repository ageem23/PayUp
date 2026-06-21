import { supabase } from "@/utils/supabase/client";

export type AccessRequestResult =
  | { ok: true; alreadyPending: boolean }
  | { ok: false; error: string };

/**
 * Records a pending "unlimited access" request for the current user (Story
 * 14.5). Granting stays an explicit admin action (adding the email to
 * allowed_users). A repeat submission while one is already pending is handled
 * gracefully: the partial unique index (`status = 'pending'`) raises 23505,
 * which we report as success/alreadyPending rather than an error (AC5).
 */
export async function requestUnlimitedAccess(): Promise<AccessRequestResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to request access." };
  }
  // An access request with a blank email is useless to the admin granting it
  // (they whitelist by email). Refuse rather than record an unactionable row.
  if (!user.email) {
    return { ok: false, error: "Your account has no email address on file." };
  }

  const { error } = await supabase.from("access_requests").insert({
    user_id: user.id,
    email: user.email,
  });

  if (error) {
    // 23505 = unique_violation → an open request already exists. Graceful no-op.
    if (error.code === "23505") {
      return { ok: true, alreadyPending: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, alreadyPending: false };
}
