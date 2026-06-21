"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";

type Status = "working" | "error";

// Invite tokens are uuids. Validating the format up front rejects malformed
// route params (e.g. path-traversal `../../x`) before they reach the redirect
// URL or the RPC.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Magic invite redemption (Epic 11, Story 11.2). Anonymous visitors are sent to
// log in (returning here afterwards); logged-in visitors are added to the trip
// via the redeem RPC and forwarded to it. Invalid/disabled tokens → error.
export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [status, setStatus] = useState<Status>("working");
  // Track which token we've already redeemed, so navigating between two invite
  // links without a remount still redeems the second one.
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    // Reject a malformed token before it ever reaches the redirect URL or RPC.
    if (!UUID_RE.test(token)) {
      setStatus("error");
      return;
    }

    // Not signed in → bounce to login, preserving where to return to (AC2).
    if (!user) {
      router.replace(`/?redirect=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }

    // Redeem each token exactly once.
    if (startedRef.current === token) return;
    startedRef.current = token;

    const redeem = async () => {
      const { data, error } = await supabase.rpc("redeem_invite_token", {
        token_input: token,
      });
      if (error || !data) {
        setStatus("error");
        return;
      }
      router.replace(`/trips/${data as string}`);
    };
    void redeem();
  }, [loading, user, token, router]);

  if (status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Invalid Invite Link</h1>
        <p className="max-w-md text-neutral-600">
          This invite link is invalid or has been disabled. Ask the trip owner
          for a new one.
        </p>
        <Link href="/dashboard" className="font-medium underline">
          Go to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <p className="text-sm text-neutral-600" role="status" aria-live="polite">
        Joining trip…
      </p>
    </main>
  );
}
