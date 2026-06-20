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
import {
  DEFAULT_ACCENT,
  accentClass,
  isAccentToken,
  type AccentToken,
} from "@/utils/profile/accentColors";

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (isAccentToken(saved)) setAccentState(saved);
    } catch {
      // localStorage unavailable — keep the default for this session.
    }
  }, []);

  const setAccent = useCallback((token: AccentToken) => {
    setAccentState(token);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, token);
    } catch {
      // Persistence is best-effort.
    }
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
