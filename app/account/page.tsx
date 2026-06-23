"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

/**
 * Account settings shell (Story 15.1). Authenticated-only. Intentionally thin —
 * Stories 15.2–15.5 add the display-name, avatar, preferences, and email/
 * password sections here.
 */
export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl p-4 sm:p-6">
      <Link href="/dashboard" className="text-sm text-neutral-500 underline">
        ← Dashboard
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-semibold">Account</h1>
      <p className="text-sm text-neutral-500">Signed in as {user.email}.</p>
    </main>
  );
}
