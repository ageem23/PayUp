import type { Config } from "tailwindcss";

const config: Config = {
  // "class" strategy is the hook for future theme switching (Epic 9 dark mode).
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    // utils/ holds the accent-color palette (Story 9.2) as literal class
    // strings consumed via variables — must be scanned or JIT purges them.
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // CSS-variable-driven tokens; future themes (Epic 9) swap the
      // variable values in globals.css without touching component classes.
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      // Cell update highlight (Epic 10, Story 10.2): a soft pulse that fades to
      // transparent within 2s. `forwards` holds the final transparent state.
      keyframes: {
        cellFlash: {
          "0%": { backgroundColor: "rgba(254, 240, 138, 0.6)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        "flash-cell": "cellFlash 2s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
