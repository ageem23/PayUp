"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProfile,
  updateDisplayName,
  DISPLAY_NAME_MAX,
} from "@/utils/db/profile";

/**
 * Account settings (Stories 15.1–15.5). Authenticated-only. Currently hosts the
 * display-name editor (15.2); avatar, preferences, and email/password sections
 * land in later stories.
 */
export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    let active = true;
    void (async () => {
      const profile = await fetchProfile();
      if (active) {
        setDisplayName(profile?.displayName ?? "");
        setLoadingProfile(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loading, user, router]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus("idle");
    const result = await updateDisplayName(displayName);
    setSaving(false);
    setStatus(result.ok ? "saved" : "error");
  }, [displayName]);

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

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Profile</h2>
        <label className="flex flex-col gap-1 text-sm">
          Display name
          <input
            type="text"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setStatus("idle");
            }}
            maxLength={DISPLAY_NAME_MAX}
            placeholder={user.email ?? "Your name"}
            disabled={loadingProfile}
            className="rounded border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
          />
          <span className="text-xs text-neutral-400">
            Shown instead of your email. Leave blank to use {user.email}.
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || loadingProfile}
            className="self-start rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {status === "saved" ? (
            <span className="text-sm text-green-600">Saved ✓</span>
          ) : null}
          {status === "error" ? (
            <span role="alert" className="text-sm text-red-600">
              Couldn&apos;t save. Try again.
            </span>
          ) : null}
        </div>
      </section>
    </main>
  );
}
