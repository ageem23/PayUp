"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

  useEffect(() => {
    setThemeState(readAppliedTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
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
