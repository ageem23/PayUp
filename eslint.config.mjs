// ESLint flat config (Epic 19, Story 19.3). Next 16's eslint-config-next defaults
// to flat config and ESLint 10 drops legacy `.eslintrc` support, so this replaces
// the old `.eslintrc.json` (which extended next/core-web-vitals + next/typescript)
// using the package's native flat-config exports — same rule coverage.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".claude/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Pin the React version so eslint-plugin-react skips its auto-detection,
    // whose code path calls `context.getFilename()` — removed in ESLint 10 —
    // and crashes. (eslint-config-next 16 defaults this to "detect".)
    settings: { react: { version: "19.2" } },
  },
  {
    rules: {
      // Preserved from the legacy .eslintrc.json.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // react-hooks 7 (new with eslint-config-next 16) adds set-state-in-effect,
    // which flags these components'/contexts' deliberate mount-time loaders and
    // external-state syncs (a synchronous setState before the first await). Scope
    // the exemption to just these known sites so the rule still guards all other
    // code. Follow-up candidate: adopt it everywhere and refactor these effects.
    // ('*' matches the dynamic-route segments — '[token]'/'[id]' are glob chars.)
    files: [
      "app/dashboard/page.tsx",
      "app/invite/*/page.tsx",
      "app/trips/*/page.tsx",
      "app/trips/*/receipts/*/page.tsx",
      "components/feature/AccountMenu.tsx",
      "components/feature/MatrixStateWrapper.tsx",
      "components/feature/ReceiptSummarySidebar.tsx",
      "context/AccentColorContext.tsx",
      "context/ThemeContext.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
];

export default eslintConfig;
