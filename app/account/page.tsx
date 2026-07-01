"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProfile,
  updateDisplayName,
  uploadAvatar,
  DISPLAY_NAME_MAX,
} from "@/utils/db/profile";
import { AccountSecurity } from "@/components/feature/AccountSecurity";
import { ThemeSetting } from "@/components/feature/ThemeSetting";
import { ProfileSelector } from "@/components/feature/ProfileSelector";

/**
 * Account settings (Stories 15.1–15.5). Authenticated-only. Currently hosts the
 * display-name editor (15.2); avatar, preferences, and email/password sections
 * land in later stories.
 */
export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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
        setAvatarUrl(profile?.avatarUrl ?? null);
        setLoadingProfile(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loading, user, router]);

  const handleAvatarChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = ""; // allow re-selecting the same file
      if (!file) return;
      setUploadingAvatar(true);
      setAvatarError(null);
      const result = await uploadAvatar(file);
      setUploadingAvatar(false);
      if (result.ok) {
        setAvatarUrl(result.url);
      } else {
        setAvatarError(result.error);
      }
    },
    [],
  );

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

        <div className="flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar of unknown size; next/image would need remotePatterns config for no benefit on a small avatar
            <img
              src={avatarUrl}
              alt="Your avatar"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-xl font-semibold dark:bg-neutral-700"
            >
              {(displayName.trim() || user.email || "?")[0]?.toUpperCase()}
            </span>
          )}
          <div className="flex flex-col gap-1">
            <label className="cursor-pointer self-start rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700">
              {uploadingAvatar
                ? "Uploading…"
                : avatarUrl
                  ? "Change photo"
                  : "Upload photo"}
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) => void handleAvatarChange(event)}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
            {avatarError ? (
              <span role="alert" className="text-xs text-red-600">
                {avatarError}
              </span>
            ) : (
              <span className="text-xs text-neutral-400">
                JPG or PNG, up to 5 MB.
              </span>
            )}
          </div>
        </div>

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

      {/* Appearance controls consolidated here from the floating toggle and the
          dashboard (Story 22.4). */}
      <section className="mt-8 flex flex-col gap-3">
        <h2 className="text-lg font-medium">Appearance</h2>
        <ThemeSetting />
        <ProfileSelector />
      </section>

      <AccountSecurity currentEmail={user.email ?? ""} />
    </main>
  );
}
