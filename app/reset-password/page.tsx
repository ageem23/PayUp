"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { changePassword, MIN_PASSWORD_LENGTH } from "@/utils/auth/account";

/**
 * Password recovery page (Story 15.6). The Supabase client exchanges the
 * recovery token in the email-link URL for a short-lived session; once that
 * session is present the user can set a new password. No valid session →
 * invalid/expired link, with a path to request a fresh one (AC5).
 */
export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const result = await changePassword(password);
    setBusy(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-300 p-6 shadow-xs dark:border-neutral-700">
        {!user ? (
          <>
            <h1 className="mb-2 text-center text-2xl font-semibold">
              Link expired
            </h1>
            <p className="mb-6 mt-1 text-center text-sm text-neutral-600 dark:text-neutral-300">
              This password-reset link is invalid or has expired. Request a fresh
              one to try again.
            </p>
            <Link
              href="/forgot-password"
              className="block text-center text-sm font-medium underline"
            >
              Request a new link
            </Link>
          </>
        ) : done ? (
          <>
            <h1 className="mb-2 text-center text-2xl font-semibold">
              Password updated ✓
            </h1>
            <p className="mb-6 mt-1 text-center text-sm text-neutral-600 dark:text-neutral-300">
              You&apos;re all set — your new password is active.
            </p>
            <Link
              href="/dashboard"
              className="block rounded bg-foreground px-4 py-2 text-center text-sm font-medium text-background"
            >
              Continue to dashboard
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-6 text-center text-2xl font-semibold">
              Set a new password
            </h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                aria-label="New password"
                autoComplete="new-password"
                className="rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              />
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Confirm new password"
                aria-label="Confirm new password"
                autoComplete="new-password"
                className="rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              />
              {error ? (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy || !password}
                className="rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
              >
                {busy ? "Saving…" : "Set new password"}
              </button>
              <span className="text-center text-xs text-neutral-400">
                At least {MIN_PASSWORD_LENGTH} characters.
              </span>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
