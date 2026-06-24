# Story 19.1: Next.js 16 Pre-Upgrade Audit & Compatibility Report

Status: done

## Story

As a maintainer, I want Next 16's breaking changes mapped against what PayUp uses, so that the upgrade is planned, not discovered mid-build.

(Full acceptance criteria: [docs/docs/prd/epic-19/epic_19_overview.md](../../docs/docs/prd/epic-19/epic_19_overview.md#story-191-nextjs-16-pre-upgrade-audit--compatibility-report).)

## Compatibility Report

Source: the official [Next.js 15 → 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) (v16.2.9) cross-referenced against a scan of this codebase. **Impact key:** ✅ not used / N-A · ☑️ already handled · ⚠️ action needed.

| Next 16 change | PayUp impact |
| --- | --- |
| **Node 20.9+ / TypeScript 5.1+** | ☑️ CI uses `node-version: "20"` (resolves to latest 20.x ≥ 20.9); TS is `^5`. |
| **Turbopack is the default bundler** (dev + build) | ✅ No custom `webpack` config (`next.config.mjs` only sets `outputFileTracingRoot`), so the default works with no flag and no conflict. |
| **`turbopack` config moved out of `experimental`** | ✅ Not used. |
| **Async Request APIs — sync access fully removed** (`cookies`/`headers`/`params`/`searchParams`) | ☑️ App is 29 client components using `useParams`; the only route handler (`app/api/ocr/route.ts`) reads `await request.json()` only — no sync server APIs. Epic 16 already did the async migration. |
| **Async params for `icon`/`opengraph-image`/`sitemap`** | ✅ None of these metadata files exist. |
| **React 19.2** (Next 16 pulls React canary) | ⚠️ Bump `react`/`react-dom` to latest 19 alongside Next. |
| **React Compiler stable (opt-in)** | ✅ Won't enable. |
| **Caching APIs** (`revalidateTag` 2nd arg, `updateTag`, `cacheLife`/`cacheTag`) | ✅ No `use cache`/`revalidateTag`/cached `fetch` anywhere. |
| **Enhanced routing / prefetch** | ✅ No code changes required. |
| **PPR `experimental_ppr` removed** | ✅ Not used. |
| **`middleware` → `proxy` rename** | ✅ No middleware file. |
| **`next/image`: `images.domains` deprecated** | ✅ No `images` config at all (no `domains`). |
| **`next/image`: `qualities` default → `[75]`** | ✅ No `quality=` props in the codebase. |
| **`next/image`: `minimumCacheTTL` 60s→4h, `imageSizes` drops 16, local-IP block, maxRedirects 3** | ✅ Behavioral defaults only; remote images are Supabase Storage — verify they still load in 19.4 smoke. |
| **Parallel routes need `default.js`** | ✅ No parallel route slots. |
| **ESLint flat config** (`@next/eslint-plugin-next` defaults to flat, aligns with ESLint 10) | ⚠️ Repo uses legacy `.eslintrc.json` → migrate in **19.3**. |
| **Scroll-behavior override change** | ✅ No `scroll-behavior` set on `<html>`/in CSS. |
| **`next lint` command removed** (and `eslint` next.config key removed; `next build` no longer lints) | ⚠️ `"lint": "next lint"` → ESLint CLI in **19.3**; CI already runs lint as its own step. |
| **Removed: AMP, `serverRuntimeConfig`/`publicRuntimeConfig`, `devIndicators` opts, `experimental.dynamicIO`/`useCache`, `unstable_rootParams`** | ✅ None used. |

### Verdict: **GO** — low risk

PayUp is a client-component-heavy app with no middleware, server actions, server-side data fetching, caching APIs, AMP, PPR, or parallel routes — so the vast majority of Next 16's breaking changes don't apply. The required work is just version bumps + the lint toolchain migration.

### Concrete change list for 19.2 / 19.3

**19.2 (core upgrade):**
1. `npm install next@16 react@latest react-dom@latest` + `@types/react`/`@types/react-dom` latest; `eslint-config-next@16` (bumped together to clear the peer conflict).
2. `next.config.mjs`: no change required (`outputFileTracingRoot` stays a valid top-level key; no `eslint`/`images`/webpack keys to remove).
3. Scripts: confirm `dev`/`build` need no `--turbopack` (it's default) and don't pass `--webpack`.
4. Verify `npm run build` (Turbopack) + the canary route + a manual smoke; confirm remote Supabase images still load.

**19.3 (lint):**
1. `.eslintrc.json` → `eslint.config.mjs` (flat) via `eslint-config-next` 16's flat export; bump `eslint` → 10.
2. Preserve the two custom rules (`@typescript-eslint/no-unused-vars` `^_` ignore; `@typescript-eslint/no-explicit-any`).
3. `"lint": "next lint"` → a direct `eslint` invocation; update `.github/workflows/ci.yml` if the command changes.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Analysis-only story; no production code changed. Output is the compatibility report above (go/no-go + change list driving 19.2/19.3).

### File List

**Added:**
- `_bmad-output/implementation-artifacts/19-1-next16-preupgrade-audit.md`
