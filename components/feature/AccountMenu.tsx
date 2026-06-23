"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchProfile } from "@/utils/db/profile";

/**
 * Authenticated account entry point (Story 15.1): an avatar/email button with a
 * dropdown to reach account settings (/account) and to log out. Renders nothing
 * for signed-out users. Later stories surface the display name/avatar here.
 */
export function AccountMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Show the display name (Story 15.2) when set, falling back to the email.
  useEffect(() => {
    if (!user) {
      setDisplayName(null);
      return;
    }
    let active = true;
    void fetchProfile().then((profile) => {
      if (active) setDisplayName(profile?.displayName ?? null);
    });
    return () => {
      active = false;
    };
  }, [user]);

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const label = displayName?.trim() || user.email || "Account";
  const initial = (label[0] ?? "?").toUpperCase();

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    router.replace("/");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full border border-neutral-300 py-1 pl-1 pr-3 text-sm dark:border-neutral-700"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold dark:bg-neutral-700">
          {initial}
        </span>
        <span className="hidden max-w-[12rem] truncate sm:inline">{label}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-background shadow-lg dark:border-neutral-800"
        >
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            Account settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
