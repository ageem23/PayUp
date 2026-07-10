import { supabase } from "@/utils/supabase/client";

// Single write path for beta observability (Epic 23, Story 23.1):
//   * submitFeedback — user-submitted "Report an error" / "Suggest a feature"
//   * logError       — automatic client + server error capture
// Both are BEST-EFFORT and never throw: a logging failure must not break the
// page or recurse. All writes reuse the existing anon Supabase client under RLS
// (migration 0018) — no service-role key.

export type FeedbackKind = "error_report" | "feature_request";
export type ErrorSource = "client" | "server";

// Keep payloads bounded so a pathological error/message can't bloat a row.
const MESSAGE_MAX = 4000;
const STACK_MAX = 8000;

// Read the current user id from the locally-cached session (no network call).
// Returns null when signed out or in a server context with no session — that's
// valid for error_logs (its RLS allows a null user_id).
async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function userAgent(): string | null {
  return typeof navigator !== "undefined" ? navigator.userAgent : null;
}

/**
 * Record a user-submitted feedback report. Requires an authenticated session
 * (RLS: auth.uid() = user_id). Returns { ok } so the form can show success or a
 * non-blocking error — it never throws.
 */
export async function submitFeedback(input: {
  kind: FeedbackKind;
  message: string;
  path?: string | null;
  context?: Record<string, unknown>;
}): Promise<{ ok: boolean }> {
  try {
    const user_id = await currentUserId();
    if (!user_id) return { ok: false }; // RLS would reject an anon feedback row
    const { error } = await supabase.from("feedback_reports").insert({
      user_id,
      kind: input.kind,
      message: input.message.slice(0, MESSAGE_MAX),
      path: input.path ?? null,
      context: input.context ?? {},
      user_agent: userAgent(),
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/**
 * Record an automatic error (client or server). Fire-and-forget: swallows every
 * failure so it can never break the caller or recurse into itself.
 */
export async function logError(input: {
  source: ErrorSource;
  message: string;
  stack?: string | null;
  path?: string | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    const user_id = await currentUserId();
    await supabase.from("error_logs").insert({
      user_id,
      source: input.source,
      message: (input.message || "Unknown error").slice(0, MESSAGE_MAX),
      stack: input.stack ? input.stack.slice(0, STACK_MAX) : null,
      path: input.path ?? null,
      context: input.context ?? {},
      user_agent: userAgent(),
    });
  } catch {
    // Swallow — logging must never throw.
  }
}
