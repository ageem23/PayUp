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
import { fetchProfile, savePreferences } from "@/utils/db/profile";

export type Theme = "light" | "dark";

// Shared with the anti-flash <head> script in app/layout.tsx — keep in sync.
export const THEME_STORAGE_KEY = "app-theme";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Read the theme the anti-flash script already applied to <html>, so the
// provider's state matches the painted DOM (no flash, no toggle mismatch).
function readAppliedTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage can throw (private mode / disabled) — theme still applies
    // for this session; persistence is best-effort.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR renders "light"; the real value is synced on mount from the class the
  // inline script set. State is only used to drive the toggle's icon/label.
  const [theme, setThemeState] = useState<Theme>("light");
  // Set once the user toggles theme this session, so a late-resolving profile
  // fetch can't revert their choice to a stale DB value.
  const userInteractedRef = useRef(false);

  useEffect(() => {
    // Sync state to the theme the anti-flash script already painted.
    setThemeState(readAppliedTheme());

    // Reconcile with the DB (source of truth) once the profile loads, so the
    // theme follows the user across devices (Story 15.4). The cached value above
    // already prevented a flash; this only corrects a cross-device mismatch.
    // Signed-out users resolve to null → keep the cached/default theme. Skipped
    // if the user already toggled this session (don't clobber their choice).
    let active = true;
    void fetchProfile().then((profile) => {
      if (!active || userInteractedRef.current) return;
      const saved = profile?.theme;
      if (
        (saved === "light" || saved === "dark") &&
        saved !== readAppliedTheme()
      ) {
        applyTheme(saved);
        setThemeState(saved);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    userInteractedRef.current = true;
    applyTheme(next);
    setThemeState(next);
    // Persist to the profile so it follows the user (no-op when signed out).
    void savePreferences({ theme: next });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readAppliedTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}
