"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { readSafeRedirect } from "@/utils/auth/redirect";

/**
 * Landing route for the Google OAuth redirect. The Supabase client detects the
 * session from the URL on load; AuthProvider accepts it (Epic 14: no whitelist
 * gate — any authenticated user is valid). Once it settles we route:
 *   - signed-in user → the safe `?redirect` (e.g. an invite link) or /dashboard
 *   - no session at all → / (e.g. the user opened this URL directly)
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(readSafeRedirect() ?? "/dashboard");
    } else {
      router.replace("/");
    }
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <p className="text-sm text-neutral-600" role="status" aria-live="polite">
        Completing sign-in…
      </p>
    </main>
  );
}
