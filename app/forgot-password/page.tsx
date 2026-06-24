"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/utils/auth/account";

/**
 * "Forgot password?" entry (Story 15.6). Collects an email and sends a recovery
 * link. The confirmation is identical whether or not the email has an account —
 * no account enumeration (AC3).
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setBusy(true);
    setError(null);
    // Fire the reset; show the same confirmation regardless of the outcome so
    // we never reveal whether the address belongs to an account.
    await requestPasswordReset(email);
    setBusy(false);
    setSent(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-300 p-6 shadow-xs dark:border-neutral-700">
        <h1 className="mb-2 text-center text-2xl font-semibold">
          Reset your password
        </h1>

        {sent ? (
          <>
            <p className="mb-6 mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
              If an account exists for that email, a password-reset link is on
              its way. Check your inbox (and spam).
            </p>
            <Link
              href="/"
              className="block text-center text-sm font-medium underline"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mb-6 mt-1 text-center text-sm text-neutral-500">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  inputMode="email"
                  className="rounded border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
                />
              </label>
              {error ? (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <Link
              href="/"
              className="mt-4 block text-center text-sm text-neutral-500 underline"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
