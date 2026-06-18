---
baseline_commit: 92280cf175af80d29faafc41d130dda891ba0712
---

# Story 1.3: Supabase Universal Integration Hook Scaffolding

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a systems developer,
I want to initialize the official Supabase client library and wrap it in a single shared client utility,
so that any component can safely interact with auth or database APIs through one unified, env-validated client reference.

## Acceptance Criteria

1. `@supabase/supabase-js` is added to `package.json` dependencies and the project still builds and lints clean (`npm run build`, `npm run lint` exit 0).
2. A single client-side Supabase client is instantiated in `utils/supabase/client.ts`, reading connection strings from environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — not hardcoded.
3. The client module throws a clear, explicit error at initialization if either env var is missing, so misconfiguration fails loudly instead of producing a silent broken client.
4. A root `.env.example` documents the two expected keys (committed); real values live only in the gitignored `.env.local`.

## Tasks / Subtasks

- [x] **Install the Supabase client** (AC: #1) — Run `npm install @supabase/supabase-js`. This is an explicitly approved dependency (named in the story); it does not need separate approval. Confirm it lands in `dependencies` (not `devDependencies`) and `package-lock.json` updates.
- [x] **Create `.env.example`** (AC: #4) — At repo root, documenting the expected keys with placeholder values:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your-project-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```
  `.env.example` is NOT gitignored (only `.env*.local` is) — it must be committed. Do NOT create or commit `.env.local`.
- [x] **Write the client module** (AC: #2, #3) — Create `utils/supabase/client.ts`:
  ```typescript
  import { createClient } from "@supabase/supabase-js";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing explicit Supabase credentials in local environment configuration.",
    );
  }

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```
  - Assign env vars to local consts BEFORE the guard so the `if (!… ) throw` narrows their type from `string | undefined` to `string` — `createClient(supabaseUrl, supabaseAnonKey)` then typechecks under strict mode without `any` or non-null assertions.
- [x] **Verify** (AC: #1, #3) — Run `npm run lint` (exit 0) and `npm run build` (clean). Build must stay green even though `.env.local` is absent in this story (see critical note below).

## Dev Notes

### Previous-story intelligence (Stories 1.1 & 1.2 — `done`, this session)
- **`utils/` already exists** (created with a `.gitkeep` in 1.1). Add `utils/supabase/client.ts` under it. The `.gitkeep` can stay; it's harmless.
- **`@/*` alias → project root** is configured (1.1). Future consumers import the client as `import { supabase } from "@/utils/supabase/client"`. Verify the alias still resolves (it did for 1.1/1.2).
- **Strict ESLint gates CI** (1.1): `@typescript-eslint/no-explicit-any: error`, `@typescript-eslint/no-unused-vars: error`. The client code must have no `any` and no unused symbols. The exported `supabase` const is an export (not flagged as unused even though nothing imports it yet).
- **"Tested" = `lint` + `build` clean** — no unit-test framework; do not add one. CI runs exactly `npm ci → lint → build`.
- **CI is live** (1.2): pushing triggers `.github/workflows/ci.yml`. CI runs `npm ci`, so the updated `package-lock.json` MUST be committed or `npm ci` fails.

### 🚨 CRITICAL — module-level throw vs. `next build` (do not skip)
The guard `throw` runs at **module-initialization time**, not literally compile time. TypeScript's `tsc` (run during `next build`) only *type-checks* this file — it does NOT execute the throw. The throw only fires when the module is actually **imported and evaluated** (at runtime, or during static prerender of a route that imports it).

- **In THIS story the client is created but imported by nothing.** No route pulls it into the build graph, so `next build` never evaluates the throw → build stays green even though CI has no `.env.local`. ✅ This is why AC#1 is satisfiable now.
- **Forward warning for the first consumer story (Epic 2+):** the moment a page/component imports `@/utils/supabase/client`, the module is evaluated during `next build`'s prerender/page-data step. With no env vars in CI, the throw will **fail the build**. When that happens, the consuming story must either (a) provide placeholder `NEXT_PUBLIC_SUPABASE_*` values in the CI workflow `env:`, or (b) refactor to lazy/factory initialization. Note this for whoever builds the first Supabase-consuming feature — do not solve it here.

### Library specifics
- **`@supabase/supabase-js` v2** is current. `createClient(url, anonKey)` returns a `SupabaseClient` with `.auth`, `.from()`, `.channel()` (realtime), `.storage`. This single anon client is the right scope for the story.
- **Stay dependency-light / match the story:** use `@supabase/supabase-js` only. Do NOT pull in `@supabase/ssr` or auth-helpers — those are for cookie-based server/client auth separation, which is Epic 2+ scope, not this scaffolding story.
- `NEXT_PUBLIC_`-prefixed vars are inlined into the client bundle by Next.js and are safe to expose (the anon key is designed to be public; RLS enforces access — see architecture). Do not put service-role keys here.

### Architecture notes
- The architecture doc (`docs/04_System_Architecture_Master_v3.md`) defines the Supabase Postgres schema (`allowed_users`, `trips`, `receipts`, `trip_members`) and RLS policies. None of those tables are touched in 1.3 — this story only stands up the client. Schema/RLS work begins in Epic 2. [Source: docs/04_System_Architecture_Master_v3.md]
- RLS + the public anon key is the intended security model (NFR2): the anon key is shippable to the browser; row-level security enforces tenant isolation server-side. [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-06-17.md#NFR Coverage]

### Project Structure Notes
- New files: `utils/supabase/client.ts`, `.env.example`. Modified: `package.json`, `package-lock.json`.
- `.env.example` committed; `.env.local` stays gitignored and uncommitted. Confirm `git status` never shows `.env.local` staged.
- This is the final story of Epic 1; after it ships, Epic 1 is complete (scaffold + CI + Supabase client all in place).

### References
- [Source: docs/docs/prd/epic-1/story_01_3_supabase.md] — story statement, ACs, tasks, guard snippet (note: source has a truncated code block / stray `}f` — intent is the env-guard throw above)
- [Source: docs/docs/prd/epic-1/epic_01_overview.md] — Epic 1 binds client-side hooks to the Supabase cluster
- [Source: _bmad-output/implementation-artifacts/1-1-boilerplate.md] — `utils/` folder, `@/*` alias, strict ESLint
- [Source: _bmad-output/implementation-artifacts/1-2-canary.md] — CI runs `npm ci → lint → build`; lockfile must be committed
- [Source: docs/04_System_Architecture_Master_v3.md] — Supabase Postgres schema + RLS (deferred to Epic 2)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-ship-story pipeline

### Debug Log References

- `npm install @supabase/supabase-js` → added to `dependencies`; `package-lock.json` updated.
- `npm run lint` → `✔ No ESLint warnings or errors`.
- `npm run build` → `✓ Compiled successfully`; route table unchanged (3 routes). Build did NOT evaluate the client module's env guard (module is unimported), so it stayed green with no `.env.local` present — confirming the design note.

### Completion Notes List

- **AC#1:** `@supabase/supabase-js` v2 added to `dependencies`; lint + build clean.
- **AC#2:** Single shared client in `utils/supabase/client.ts` via `createClient(url, anonKey)`, reading `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — no hardcoded values.
- **AC#3:** Module-init guard throws `"Missing explicit Supabase credentials in local environment configuration."` if either var is missing. Env vars assigned to locals before the guard so strict TS narrows them to `string` (no `any`, no non-null assertions) → passes strict ESLint.
- **AC#4:** `.env.example` committed with both keys documented; `.env.local` left gitignored/uncommitted (verified not staged).
- **Scope discipline:** used only `@supabase/supabase-js` (no `@supabase/ssr`/auth-helpers — deferred to Epic 2). Client created but intentionally not yet consumed by any route, so `next build` does not execute the throw.
- **Forward note carried into the story:** the first route that imports this client will make `next build` evaluate the guard; CI (no `.env.local`) will then need placeholder env vars or lazy init. Flagged for the first Supabase-consuming story (Epic 2+).

### File List

**Added:**
- `utils/supabase/client.ts`
- `.env.example`

**Modified:**
- `package.json` (added `@supabase/supabase-js`)
- `package-lock.json`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Added `@supabase/supabase-js`, shared env-validated client at `utils/supabase/client.ts`, and `.env.example`. Lint/build clean. Status → review. | Amelia (Dev) |
