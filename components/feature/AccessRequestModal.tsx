"use client";

import { useState } from "react";
import { requestUnlimitedAccess } from "@/utils/db/accessRequest";

type Props = {
  onClose: () => void;
};

/**
 * Lets a free-tier user request unlimited access (Story 14.5). Submitting only
 * records the request; an admin grants it by adding the email to allowed_users.
 * A repeat request while one is pending is treated as success (graceful dedup).
 */
export function AccessRequestModal({ onClose }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestUnlimitedAccess();
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error);
      }
    } catch {
      // An unexpected throw (e.g. network) must still clear the loading state.
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request unlimited access"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-lg border border-neutral-300 bg-background p-6 shadow-lg dark:border-neutral-700">
        {done ? (
          <>
            <h2 className="mb-2 text-lg font-semibold">Request sent ✅</h2>
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
              Thanks! Your request for unlimited access was recorded. An admin
              will review it and add you to the unlimited tier — you&apos;ll be
              able to add receipts without the weekly limit once approved.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-lg font-semibold">Request unlimited access</h2>
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
              You&apos;re on the free tier (3 receipts per week). Request
              unlimited access and an admin will review it. This doesn&apos;t
              grant access immediately.
            </p>

            {error ? (
              <p role="alert" className="mb-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex-1 rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
