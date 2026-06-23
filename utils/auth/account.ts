import { supabase } from "@/utils/supabase/client";

export const MIN_PASSWORD_LENGTH = 8;

export type AuthActionResult = { ok: true } | { ok: false; error: string };

/** Map a raw Supabase auth error to a friendly, non-leaky message (Story 15.5 AC3). */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("at least") || m.includes("weak") || m.includes("password")) {
    return `Please choose a stronger password (at least ${MIN_PASSWORD_LENGTH} characters).`;
  }
  if (m.includes("already") || m.includes("registered") || m.includes("in use")) {
    return "That email is already in use.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Please try again in a little while.";
  }
  if (m.includes("same")) {
    return "That's already your current value.";
  }
  return "Something went wrong. Please try again.";
}

/**
 * Changes the current user's password on their own session (Story 15.5).
 * Supabase keeps the session valid after a password change.
 */
export async function changePassword(
  newPassword: string,
): Promise<AuthActionResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: friendlyAuthError(error.message) };
  return { ok: true };
}

/**
 * Starts an email change for the current user (Story 15.5). Supabase sends a
 * confirmation link to the NEW address; the email only changes once confirmed.
 */
export async function changeEmail(newEmail: string): Promise<AuthActionResult> {
  const email = newEmail.trim();
  if (!email) return { ok: false, error: "Please enter an email address." };
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { ok: false, error: friendlyAuthError(error.message) };
  return { ok: true };
}
