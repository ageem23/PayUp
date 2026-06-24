# Story 18.1: Toolchain & Entrypoint Swap

Status: done

## Story

As a maintainer, I want the project building on Tailwind v4's toolchain, so that the rest of the migration has a compiling baseline.

(Full acceptance criteria: [docs/docs/prd/epic-18/epic_18_overview.md](../../docs/docs/prd/epic-18/epic_18_overview.md#story-181-toolchain--entrypoint-swap).)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Installed `tailwindcss@^4.3.1` + `@tailwindcss/postcss@^4.3.1` (removed the v3 PostCSS-plugin path).
- `postcss.config.mjs`: `tailwindcss: {}` → `"@tailwindcss/postcss": {}` (the #27 build error is resolved).
- `app/globals.css`: replaced the three `@tailwind` directives with `@import "tailwindcss";` plus a **temporary** `@config "../tailwind.config.ts";` bridge so the existing darkMode/content/theme keep working until the CSS-first port in 18.2. The `:root`/`.dark` CSS variables are unchanged.
- `npm run build` compiles on v4 (a benign `MODULE_TYPELESS_PACKAGE_JSON` warning comes from the `@config` shim loading the `.ts` file — it goes away in 18.2 when the shim is removed). `npm run lint` + `npm test` (90) clean.

### File List

**Modified:**
- `package.json` / `package-lock.json`
- `postcss.config.mjs`
- `app/globals.css`
