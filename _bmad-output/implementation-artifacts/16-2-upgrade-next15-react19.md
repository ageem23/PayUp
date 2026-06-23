# Story 16.2: Upgrade to Next.js 15 & React 19

Status: done

## Story

As a maintainer,
I want the app on Next.js 15.5.16 and React 19,
so that the 14 Next.js vulnerabilities are eliminated and we're on current, supported releases.

## Acceptance Criteria

1. `next` is upgraded to ≥ 15.5.16, `react` / `react-dom` to 19.x, and `eslint-config-next`, `@types/react`, `@types/react-dom` are updated to matching versions.
2. The official Next.js and React 19 codemods are applied, and the breaking changes they surface are fixed.
3. Async request APIs are handled correctly: any use of `cookies()` / `headers()` / `draftMode()` and any dynamic-route `params` / `searchParams` consumed as props are awaited per Next 15.
4. The app installs cleanly and `npm run lint`, `npm run build`, and `npm test` all pass on the new versions.
5. All 14 Next.js Dependabot alerts (**#2–#6, #8–#16**) are resolved.
6. No functional regressions in the app's critical paths (validated in 16.3).

## Tasks / Subtasks

- [ ] **Run the Next.js upgrade codemod** (AC: 1, 2) — `npx @next/codemod@latest upgrade latest` (targets ≥ 15.5.16). This bumps `next`, `react`, `react-dom`, `eslint-config-next` and runs the built-in transforms. Pin `next` to ≥ 15.5.16 explicitly if the codemod resolves lower.
- [ ] **Bump React 19 types + apply React 19 codemods** (AC: 1, 2) — `@types/react@^19`, `@types/react-dom@^19`; run the React 19 codemods (`npx codemod@latest react/19/...`) for removed/changed APIs.
- [ ] **Audit async request APIs** (AC: 3)
  - [ ] Grep for `cookies(`, `headers(`, `draftMode(` — await them (now async in Next 15). Check the Supabase server helpers / any server-side auth.
  - [ ] Audit dynamic-route **server** pages that consume `params`/`searchParams` as props: `app/trips/[id]`, `app/trips/[id]/receipts/[receiptId]`, `app/invite/[token]`. If a page is `"use client"` and uses the `useParams()` hook, it's **unaffected**; only server components taking `params` as a prop need `await`.
- [ ] **Caching defaults** (AC: 6) — Next 15 no longer caches `fetch`/GET Route Handlers by default. Review `app/api/ocr/route.ts` and data reads; add explicit caching only where intended.
- [ ] **Fix TypeScript fallout** (AC: 4) — `@types/react@19` is stricter (`ReactNode`, `useRef` requires an initial value, ref-as-prop). Resolve build/type errors.
- [ ] **`next.config` / `next/image`** (AC: 6) — confirm image config is valid under Next 15 (the optimizer changed across several alerts); the login banner and avatars must still render.
- [ ] **Green suite** (AC: 4) — `npm run lint` + `npm run build` + `npm test` all pass.
- [ ] **Confirm alerts cleared** (AC: 5) — after merge, the 14 Next alerts (#2–#6, #8–#16) drop off the Dependabot tab.

## Dev Notes

- **The major upgrade is mandatory, not optional** — every Next.js fix here is published only in the 15.x line; there is no 14.x patch. ≥ 15.5.16 covers all 14 alerts. [Source: docs/docs/prd/epic-16/epic_16_overview.md#overview]
- **Current state:** `next@14.2.35`, `react@^18`, `react-dom@^18`, `eslint-config-next@14.2.35`, `tailwindcss@^3.4.1`. Tailwind 3.4 is compatible with Next 15 — do **not** upgrade Tailwind here (out of scope). [Source: package.json]
- **Breaking surfaces** (full list): async `cookies`/`headers`/`draftMode`/`params`/`searchParams`; uncached-by-default `fetch`/GET handlers; React 19 stricter types, ref-as-prop, removed `propTypes`/`defaultProps`/string refs/legacy context. [Source: docs/docs/prd/epic-16/epic_16_overview.md#target-approach--technical-notes]
- **Most dynamic pages are likely client components** (`"use client"` + `useParams()`), which the async-`params` change does NOT affect — verify before rewriting anything.
- **This is high-risk** — it changes the framework and React major under the whole app. Story 16.3 is the dedicated regression pass; don't consider 16.2 "done" until 16.3 is green.

### Project Structure Notes

- Touch: `package.json`, `package-lock.json`, possibly `next.config.*`, `.eslintrc*`, and any server components consuming `params`/`cookies`/`headers`. Coordinate the lockfile change with any parallel session.

### References

- [Source: docs/docs/prd/epic-16/epic_16_overview.md#story-162-upgrade-to-nextjs-15--react-19]
- Dependabot alerts #2–#6, #8–#16 (Next.js), all patched in ≥ 15.5.16.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Bumped `next` → `^15.5.16` (resolved **15.5.19**), `react`/`react-dom` → `^19` (**19.2.7**), `@types/react`/`@types/react-dom` → `^19`, `eslint-config-next` → `^15.5.16`. `npm install` → **0 vulnerabilities**.
- **Pre-upgrade audit drove a clean upgrade with no app-code changes:** no `cookies()`/`headers()`/`draftMode()` anywhere; all dynamic routes are `"use client"` + `useParams()` (the async-`params` change doesn't apply); no `forwardRef` and no bare `useRef()` (React 19 type tightening didn't bite); empty `next.config` (no image-optimizer config to migrate). So no codemod transforms were required.
- **`next.config.mjs`:** added `outputFileTracingRoot: __dirname` to silence Next 15's workspace-root inference warning (a stray `package-lock.json` in the home dir was being picked as root).
- `npm run lint` + `npm run build` + `npm test` (75 tests) all green on the new majors; build emits all 13 routes.
- 16.2 is code-complete; final sign-off is Story 16.3 (regression verification).

### File List

**Modified:**
- `package.json`
- `package-lock.json`
- `next.config.mjs`
