---
baseline_commit: 019c4ae8a08e80ea11adf7fc5a89c98dfe7db40f
---

# Story 1.1: Next.js Boilerplate, Directory Structuring & Strict Code Quality Tools

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a core software engineer,
I want to initialize the Next.js App Router project with Tailwind CSS, TypeScript, and strict ESLint configuration rules,
so that the development team operates within an identical, bug-resistant directory convention from day one.

## Acceptance Criteria

1. The project compiles cleanly using `npm run build` with **zero** linter errors and **zero** unhandled TypeScript compilation warnings. `npm run lint` exits 0.
2. The root folder hierarchy strictly provisions standalone directories matching our structural conventions (non-`src` layout):
   * `/app` — Dynamic page segments and layouts (created by `create-next-app`).
   * `/components/ui` — Reusable, stateless presentational primitives (buttons, inputs).
   * `/components/feature` — Stateful structural view containers (e.g., matrix grid).
   * `/context` — Global React shared-state providers.
   * `/utils` — Pure mathematical algorithms and formatters.
   * `/types` — Shared TypeScript type declarations.
3. The Tailwind configuration file includes a populated `theme.extend` block reserved as the hook for future theme switching (Epic 9 dark mode / color profiles).
4. `tsconfig.json` enforces `"strict": true` and the `@/*` path alias resolves to the **project root** (`./*`), enabling imports like `@/utils/...` and `@/components/...`.
5. The Next.js starter scaffolding is stripped: `app/page.tsx` renders a blank/minimal canvas and `app/globals.css` contains only the Tailwind directives plus base resets (no demo gradient/hero markup).

## Tasks / Subtasks

- [x] **Scaffold the workspace** (AC: #2, #4) — Initialize Next.js 14 App Router in the **project root** (the repo already exists; do not create a nested subfolder).
  - [x] Run a **fully non-interactive** scaffold. The epic's shorthand `--src-dir=false` is **not a valid `create-next-app` flag** — use `--no-src-dir`, and add `--import-alias` + `--use-npm` so the command never blocks on prompts:
    ```bash
    npx create-next-app@14 . --typescript --eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-npm
    ```
  - [x] If `create-next-app` refuses because the directory is non-empty (existing `docs/`, `_bmad/`, `.git`), scaffold into a temp dir and move files into root, OR confirm the conflict prompt — **never** delete `docs/`, `_bmad*`, `.git`, or `.claude/`.
- [x] **Configure TypeScript strictness** (AC: #1, #4) — In `tsconfig.json`: confirm `compilerOptions.strict` is `true` (includes `strictNullChecks`), and confirm `paths` maps `"@/*": ["./*"]` (root, since there is no `src` dir).
- [x] **Create folder skeletons** (AC: #2) — Manually create `components/ui`, `components/feature`, `context`, `utils`, `types`. Empty dirs aren't tracked by git — add a `.gitkeep` to each so the structure is committed.
- [x] **Configure strict ESLint** (AC: #1) — In `.eslintrc.json` (or `eslint.config` if generated), extend `next/core-web-vitals` and add rules that fail on unused imports/vars and enforce clean type declarations (e.g. `@typescript-eslint/no-unused-vars: "error"`, `no-unused-vars: "off"` in favor of the TS rule). Keep rules achievable so AC#1 (zero errors) passes on the clean scaffold.
- [x] **Strip the starter template** (AC: #5) — Replace `app/page.tsx` with a minimal component (blank canvas, e.g. a single empty `<main>`), and clear `app/globals.css` down to the `@tailwind base; @tailwind components; @tailwind utilities;` directives (plus minimal base resets). Remove unused starter assets (`public/next.svg`, `public/vercel.svg`) if importing them anywhere would trip the lint.
- [x] **Seed the Tailwind theme hook** (AC: #3) — In `tailwind.config.ts`, ensure `content` globs cover `./app/**/*`, `./components/**/*`, `./context/**/*`, and leave a non-empty `theme.extend` (even a documented placeholder) for Epic 9.
- [x] **Verify** (AC: #1) — Run `npm run lint` and `npm run build` locally; both must exit 0 with no warnings before marking the story done.

## Dev Notes

### Greenfield context (read first)
* **This is the first build story in the repo.** There is currently **no `package.json` and zero application source** (confirmed) — only planning docs under `docs/`, `_bmad*/` tooling, `.claude/`, and `.git`. Do not assume any prior scaffolding exists.
* **Preserve non-app files.** The scaffold runs in a repo that already contains `docs/`, `_bmad/`, `_bmad-output/`, `.claude/`, `.git`, `README.md`. These must survive. If a tool wants to overwrite/clean the directory, intervene — only Next.js-owned files (`app/`, `public/`, `package.json`, configs) should be added.

### Architecture & convention guardrails (MUST follow)
* **Tech stack (pinned):** Next.js **14.2+** (App Router), Tailwind CSS **3.4+**, TypeScript **strict mode**. [Source: docs/docs/prd/epic-1/epic_01_overview.md#Target Architecture Blueprint]
* **Non-`src` layout is mandatory.** All top-level architecture folders (`app`, `components`, `context`, `utils`, `types`) live directly in the **project root**, not under `src/`. This is why the `@/*` alias must map to `./*`, not `./src/*`. [Source: docs/docs/prd/epic-1/story_01_1_boilerplate.md#Dev Notes]
* **Stay dependency-light.** Do **not** install component frameworks (Shadcn, Material UI, etc.) at this stage. Keep atomic components dependency-free for portability. Only add `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `eslint` and their required peers from the scaffold. [Source: docs/docs/prd/epic-1/story_01_1_boilerplate.md#Dev Notes]
* The authoritative architecture doc (`docs/04_System_Architecture_Master_v3.md`) is **DB-schema only** (Supabase/Postgres tables + RLS) and introduces no constraints for this scaffolding story — those tables land in Epics 2–4, not now. No DB work in Story 1.1.

### Cross-story dependencies — get these right now so 1.2 and 1.3 don't break
This scaffold is the foundation the next two stories build directly on top of. Provide these or they will be blocked:
* **Story 1.2 (`/canary` + CI)** depends on: working `npm run lint` and `npm run build` scripts in `package.json` (CI runs them), and an `app/` dir ready for `app/canary/page.tsx`. The CI workflow will live at `.github/workflows/ci.yml` — do not create it here, but don't block it either. [Source: docs/docs/prd/epic-1/story_01_2_canary.md]
* **Story 1.3 (Supabase client)** depends on: the `@/*`→root alias working (so `@/utils/supabase/client.ts` resolves) and the `utils/` folder existing. It will add `utils/supabase/client.ts` and `.env.local` keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Don't pre-create the supabase client now — just guarantee the alias + `utils/` folder. [Source: docs/docs/prd/epic-1/story_01_3_supabase.md]

### Latest-tech / tooling notes
* **Next.js 14 is intentionally pinned** (`create-next-app@14`). Do **not** auto-upgrade to 15+ — the epic's blueprint, App Router conventions, and CI expectations target 14.2+. Pin via the `@14` tag and verify `package.json` lands on `^14.2.x`.
* **Node requirement:** Next 14 needs Node `>= 18.17`. Verify the local/CI runtime before scaffolding.
* **Non-interactive scaffolding is the #1 footgun here.** `create-next-app` prompts (and hangs CI) for any option not passed as a flag — most easily the import alias. Always pass `--import-alias "@/*"`, `--use-npm`, and `--no-src-dir`. The literal `--src-dir=false` from the task list is **not recognized** by `create-next-app` and will trigger the interactive prompt or error.
* **ESLint config format:** `create-next-app@14` generates `.eslintrc.json` (legacy/eslintrc style) extending `next/core-web-vitals`. Add the strict rules in that file; don't migrate to flat config for this story.

### Testing standards
* No unit-test framework is mandated for Epic 1 (keep dependency-light per dev notes — do **not** add Jest/Vitest now). The **definition of "tested" for this story is**: `npm run lint` exits 0 with no warnings, and `npm run build` completes a clean production build with no TypeScript errors/warnings (AC#1). Run both before setting status to review.

### Project Structure Notes
* Final root structure after this story (Next.js-owned + manually created):
  ```
  app/                  (page.tsx, layout.tsx, globals.css)
  components/ui/        (.gitkeep)
  components/feature/   (.gitkeep)
  context/              (.gitkeep)
  utils/                (.gitkeep)
  types/                (.gitkeep)
  public/
  package.json, tsconfig.json, tailwind.config.ts, postcss.config.js, .eslintrc.json, next.config.mjs, .gitignore
  ```
* No conflicts with existing repo contents expected — Next.js files are additive alongside `docs/`, `_bmad*/`, `.claude/`.
* **Title correction note:** the source story file is mislabeled "Story 11.1 / 1.1" (a copy-paste artifact flagged in the readiness report). This is **Story 1.1 of Epic 1** — unrelated to Epic 11 (Magic Links).

### References

- [Source: docs/docs/prd/epic-1/story_01_1_boilerplate.md] — story statement, ACs, tasks, dev notes
- [Source: docs/docs/prd/epic-1/epic_01_overview.md#Target Architecture Blueprint] — Next.js 14.2+, Tailwind 3.4+, TS strict, CI-on-PR
- [Source: docs/docs/prd/epic-1/story_01_2_canary.md] — downstream CI + `/canary` dependency on build/lint scripts
- [Source: docs/docs/prd/epic-1/story_01_3_supabase.md] — downstream `@/*` alias + `utils/` dependency
- [Source: docs/04_System_Architecture_Master_v3.md] — DB schema (no Story 1.1 constraints; DB work deferred to Epics 2–4)
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-06-17.md#Minor Concerns] — mislabeled title artifact (item 6)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-dev-story workflow

### Debug Log References

- `npx create-next-app@14 payup-tmp --typescript --eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --skip-install` → scaffolded into temp dir (root non-empty due to `_bmad/`, `.claude/`, `.agents/` which `create-next-app` rejects). `--skip-install` was not honored by 14.2.35 (deps installed anyway).
- Moved generated files into project root (same-drive rename), preserved existing root `README.md` and merged `.gitignore`; removed temp dir.
- `npm run lint` → `✔ No ESLint warnings or errors`.
- `npm run build` → `✓ Compiled successfully`, type-check passed, 5 static pages generated (`/`, `/_not-found`).

### Completion Notes List

- **Scaffold strategy:** Because the repo root already contained non-allowlisted dirs (`_bmad/`, `_bmad-output/`, `.claude/`, `.agents/`), `create-next-app` could not run in place. Scaffolded into `payup-tmp/`, moved Next.js-owned files to root, then deleted the temp dir. All pre-existing files (`docs/`, `_bmad*/`, `.claude/`, `.git`, root `README.md`) preserved.
- **AC#1 (clean build/lint):** ✅ `npm run lint` exits 0 with no warnings; `npm run build` compiles with zero TS errors/warnings.
- **AC#2 (directory hierarchy):** ✅ `app/` (from scaffold) + manually created `components/ui`, `components/feature`, `context`, `utils`, `types`, each with a `.gitkeep`. Non-`src` layout confirmed.
- **AC#3 (Tailwind theme hook):** ✅ `tailwind.config.ts` keeps a populated `theme.extend.colors` (CSS-variable tokens) and adds `darkMode: "class"` as the explicit hook for Epic 9 theme switching; `content` globs updated to `app`/`components`/`context` (dropped the non-existent `pages` glob).
- **AC#4 (TS strict + alias):** ✅ Generated `tsconfig.json` already had `"strict": true` and `"@/*": ["./*"]` (root) — verified, no change needed.
- **AC#5 (stripped canvas):** ✅ `app/page.tsx` reduced to an empty `<main>`; `app/globals.css` reduced to the three `@tailwind` directives plus `:root` color tokens; `app/layout.tsx` stripped of the Geist `localFont` setup and template metadata (now title "PayUp"); removed orphaned `app/fonts/`. The 14.2 `app-tw` template references remote `nextjs.org` icons rather than bundling `public/*.svg`, so there were no local starter SVGs to remove and no `public/` dir was generated.
- **ESLint hardening:** extended generated config (`next/core-web-vitals` + `next/typescript`) with `@typescript-eslint/no-unused-vars` (error, `^_` ignore) and `@typescript-eslint/no-explicit-any` (error) for clean type declarations.
- **Dependency discipline:** no component frameworks added — only the create-next-app baseline (`next@14.2.35`, `react@18`, `tailwindcss@3.4`, `eslint@8`, `typescript@5`).
- **Downstream readiness:** `npm run lint`/`npm run build` scripts present for Story 1.2 CI; `@/*`→root alias and `utils/` folder present for Story 1.3 Supabase client.

### File List

**Added (Next.js scaffold, committed):**
- `package.json` (name set to `payup`)
- `package-lock.json`
- `tsconfig.json`
- `next.config.mjs`
- `next-env.d.ts`
- `postcss.config.mjs`
- `tailwind.config.ts` (theme hook + content globs)
- `.eslintrc.json` (strict rules added)
- `app/layout.tsx` (stripped)
- `app/page.tsx` (blank canvas)
- `app/globals.css` (minimal)
- `app/favicon.ico`
- `components/ui/.gitkeep`
- `components/feature/.gitkeep`
- `context/.gitkeep`
- `utils/.gitkeep`
- `types/.gitkeep`

**Modified (pre-existing):**
- `.gitignore` (merged BMad ignores with Next.js ignores)

**Removed:**
- `app/fonts/GeistVF.woff`, `app/fonts/GeistMonoVF.woff` (template fonts no longer referenced)

**Not committed (gitignored):**
- `node_modules/`, `.next/`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Implemented Next.js 14 scaffold, strict tooling, directory skeleton, and theme hook. Lint + build verified clean. Status → review. | Amelia (Dev) |
