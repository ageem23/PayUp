import type { Config } from "tailwindcss";

const config: Config = {
  // "class" strategy is the hook for future theme switching (Epic 9 dark mode).
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // CSS-variable-driven tokens; future themes (Epic 9) swap the
      // variable values in globals.css without touching component classes.
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
