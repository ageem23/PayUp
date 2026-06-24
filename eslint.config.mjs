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
      // react-hooks 7 (new with eslint-config-next 16) adds this rule, which
      // flags the app's deliberate "load data on mount" effects (a synchronous
      // setState before the first await in a loader). It wasn't enforced before
      // this upgrade; turned off to keep Epic 19 a behavior-preserving tooling
      // migration. Revisit as a separate code-quality pass if we want to adopt it.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
