# Story 19.3: ESLint Flat-Config Migration + ESLint 10

Status: done

## Story

As a maintainer, I want linting migrated to flat config on ESLint 10, so that ESLint 10 installs cleanly and we keep the same rule coverage.

(Full acceptance criteria: [docs/docs/prd/epic-19/epic_19_overview.md](../../docs/docs/prd/epic-19/epic_19_overview.md#story-193-eslint-flat-config-migration--eslint-10).)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- **New `eslint.config.mjs` (flat); deleted `.eslintrc.json`.** Uses eslint-config-next 16's native flat exports — `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` (no `@eslint/eslintrc`/FlatCompat needed) — reproducing the old `extends`.
- **Custom rules preserved:** `@typescript-eslint/no-unused-vars` (`^_` ignore) + `@typescript-eslint/no-explicit-any`.
- **Lint script:** `"next lint"` → `"eslint ."` (`next lint` removed in Next 16). CI runs `npm run lint`, so no `ci.yml` change needed.
- **Two upgrade-driven fixes, both documented in the config:**
  1. *Pinned `settings.react.version` to `"19.2"`* — eslint-config-next 16 defaults it to `"detect"`, whose code path calls `context.getFilename()` (removed in ESLint 10) and crashes the run. Pinning skips detection.
  2. *Disabled `react-hooks/set-state-in-effect`* — a new rule in react-hooks 7 (bundled by eslint-config-next 16) that flagged 9 of the app's deliberate "load data on mount" effects. It wasn't enforced pre-upgrade; turned off to keep this a behavior-preserving migration. **Follow-up candidate:** adopt it + refactor those effects as a separate code-quality pass.
- `npm run lint` (ESLint 10, exit 0) + `npm run build` + `npm test` (90) all green.

### File List

**Added:**
- `eslint.config.mjs`

**Deleted:**
- `.eslintrc.json`

**Modified:**
- `package.json` (lint script)
