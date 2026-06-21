"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

type Props = {
  tripId: string;
};

// Owner-only "Share" panel (Epic 11, Story 11.1): generate, copy, and disable a
// magic invite link. Token reads/mutations all go through SECURITY DEFINER RPCs
// with an owner check, so the token is never exposed to members (it is not
// selected into the trip page payload).
export function InviteLinkManager({ tripId }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load any existing token (owner-only RPC). This panel only renders for the
  // owner, so a non-owner never reaches here.
  useEffect(() => {
    let active = true;
    void supabase
      .rpc("get_invite_token", { trip_id_input: tripId })
      .then(({ data }) => {
        if (active && data) setToken(data as string);
      });
    return () => {
      active = false;
    };
  }, [tripId]);

  // Built on the client so the origin matches wherever the app is served.
  const link =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${token}`
      : null;

  const generate = async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    const { data, error: rpcError } = await supabase.rpc(
      "generate_invite_token",
      { trip_id_input: tripId },
    );
    if (rpcError || !data) {
      setError("Couldn't generate an invite link. Please try again.");
    } else {
      setToken(data as string);
    }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    const { error: rpcError } = await supabase.rpc("disable_invite_token", {
      trip_id_input: tripId,
    });
    if (rpcError) {
      setError("Couldn't disable the link. Please try again.");
    } else {
      setToken(null);
    }
    setBusy(false);
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Couldn't copy — select and copy the link manually.");
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
      <h2 className="text-lg font-medium">Share</h2>
      <p className="text-sm text-neutral-500">
        Anyone allow-listed can use this link to log in and join the trip as a
        member.
      </p>

      {link ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              readOnly
              aria-label="Invite link"
              value={link}
              onFocus={(event) => event.target.select()}
              className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 font-mono text-xs dark:border-neutral-700"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                onClick={disable}
                disabled={busy}
                className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Disable
              </button>
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="w-fit rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate Invite Link"}
        </button>
      )}

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </section>
  );
}
