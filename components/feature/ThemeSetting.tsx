"use client";

import { useTheme } from "@/context/ThemeContext";

// Labeled light/dark control for the account page's Appearance section
// (Story 22.4). Replaces the old floating ThemeToggle — same `useTheme` state,
// just a discoverable card control instead of a fixed corner button.
export function ThemeSetting() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <section className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
      <h2 className="text-sm font-semibold">Theme</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Switch between light and dark mode.
      </p>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${next} mode`}
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {theme === "dark" ? (
          // Sun — click to go light.
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          // Moon — click to go dark.
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
        {theme === "dark" ? "Dark mode" : "Light mode"}
      </button>
    </section>
  );
}
