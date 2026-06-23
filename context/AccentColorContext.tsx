"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_ACCENT,
  accentClass,
  isAccentToken,
  type AccentToken,
} from "@/utils/profile/accentColors";
import { fetchProfile, savePreferences } from "@/utils/db/profile";

export const ACCENT_STORAGE_KEY = "app-accent-color";

type AccentColorContextValue = {
  accent: AccentToken;
  /** The `accent-*` Tailwind class for the current selection. */
  accentClassName: string;
  setAccent: (token: AccentToken) => void;
};

const AccentColorContext = createContext<AccentColorContextValue | undefined>(
  undefined,
);

export function AccentColorProvider({ children }: { children: ReactNode }) {
  // SSR/default is the fixed default; the saved choice is read on mount. The
  // only visible effect is checkbox tint, so a one-frame default→saved is fine.
  const [accent, setAccentState] = useState<AccentToken>(DEFAULT_ACCENT);
  // Set once the user picks an accent this session, so a late-resolving profile
  // fetch can't revert their choice to a stale DB value.
  const userInteractedRef = useRef(false);

  useEffect(() => {
    // 1) Instant: the cached choice (no flash).
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (isAccentToken(saved)) setAccentState(saved);
    } catch {
      // localStorage unavailable — keep the default for this session.
    }

    // 2) Reconcile with the DB (source of truth) once the profile loads, so the
    // preference follows the user across devices (Story 15.4). Signed-out users
    // resolve to null → keep the cached/default value, no error. Skipped if the
    // user already chose an accent this session (don't clobber their selection).
    let active = true;
    void fetchProfile().then((profile) => {
      if (!active || userInteractedRef.current) return;
      const accent = profile?.accentColor ?? null;
      if (isAccentToken(accent)) {
        setAccentState(accent);
        try {
          localStorage.setItem(ACCENT_STORAGE_KEY, accent);
        } catch {
          // best-effort cache refresh
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setAccent = useCallback((token: AccentToken) => {
    userInteractedRef.current = true;
    setAccentState(token);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, token);
    } catch {
      // Persistence is best-effort.
    }
    // Persist to the profile so it follows the user (no-op when signed out).
    void savePreferences({ accentColor: token });
  }, []);

  const value = useMemo(
    () => ({ accent, accentClassName: accentClass(accent), setAccent }),
    [accent, setAccent],
  );

  return (
    <AccentColorContext.Provider value={value}>
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor(): AccentColorContextValue {
  const context = useContext(AccentColorContext);
  if (context === undefined) {
    throw new Error("useAccentColor must be used within an AccentColorProvider.");
  }
  return context;
}
