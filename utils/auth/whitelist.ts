import { supabase } from "@/utils/supabase/client";

/**
 * Returns true when the email exists in the public.allowed_users whitelist.
 * The email is normalized (trimmed + lowercased) to match Supabase Auth, which
 * stores emails lowercased — without this, "User@x.com" would authenticate but
 * fail a case-sensitive whitelist lookup and get signed out.
 * Uses maybeSingle() so an absent email resolves to null data (not an error).
 * On any query error we fail closed (treat as not authorized).
 */
export async function isWhitelisted(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    return false;
  }
  return data !== null;
}
