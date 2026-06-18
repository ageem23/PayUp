---
baseline_commit: 5a9260d262bb115cf43eca64fd1609cf1d78328f
---

# Story 1.2: CI/CD Pipeline Automation & Automated System Smoke Routing (`/canary`)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a DevOps engineer,
I want an automated integration workflow linked to code changes on the main branch plus a public `/canary` health route,
so that codebase breaks are flagged before reaching cloud hosting and system availability can be verified end-to-end.

## Acceptance Criteria

1. Every push and pull request targeting the default branch automatically runs `npm run lint` and `npm run build` via a GitHub Actions workflow; the workflow fails (non-zero) if either step fails.
2. Navigating to the absolute path `/canary` returns HTTP `200 OK` with no auth gate or redirect.
3. `/canary` renders a minimal, clean payload containing an immutable status + version confirmation, e.g. `{"status": "operational", "version": "1.0.0"}`.

## Tasks / Subtasks

- [x] **Create the CI workflow** (AC: #1) — Add `.github/workflows/ci.yml`.
  - [x] Trigger on **push (all branches)** and **pull_request**, so the workflow runs both on the feature branch push (for pre-merge verification) and on PRs into `main`. Minimum: `on: { push: {}, pull_request: { branches: [main] } }`.
  - [x] Job steps (Ubuntu runner): `actions/checkout@v4` → `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'` (built-in cache is keyed on `package-lock.json`, satisfying the "dependency restoration cache matching package-lock.json" requirement) → `npm ci` → `npm run lint` → `npm run build`.
  - [x] Use `npm ci` (NOT `npm install`) — it installs exactly from `package-lock.json` and fails if the lock is out of sync. This is the correct "restore deps matching the lockfile" step.
- [x] **Create the `/canary` route** (AC: #2, #3) — Add `app/canary/page.tsx` as a static Server Component (App Router segment → URL `/canary`).
  - [x] Define an immutable status object (`{ status: "operational", version: "1.0.0" }`) and render it as a clean text/JSON block (e.g. inside a `<pre>` or `<main>`). Keep it a plain Server Component — do NOT mark it `"use client"`, and do NOT call dynamic APIs (`cookies()`, `headers()`, `searchParams`) so Next prerenders it as static (`○` in build output).
  - [x] Keep the route pure and un-gated: no auth context, no `redirect()`, no middleware. It exists to test raw web-server availability. [Source: docs/docs/prd/epic-1/story_01_2_canary.md#Dev Notes]
- [x] **Verify locally** (AC: #2, #3) — Run `npm run lint` (must exit 0) and `npm run build` (must compile clean and list `/canary` as a route). Optionally `npm run start` and curl `/canary` to confirm `200` + payload.
- [x] **Verify CI on GitHub** (AC: #1) — Commit and push the workflow on the working branch, then confirm the Actions run succeeds **before** merging. Use the GitHub CLI: `gh run list --branch <branch>` then `gh run watch <run-id>` (or `gh run view <run-id> --log-failed` on failure). [Source: project memory — use `gh` CLI for all GitHub operations]

## Dev Notes

### Previous-story intelligence (Story 1.1 — `done`, this session)
The scaffold is already in place and committed. Build on it; do not re-scaffold.
* **Scripts exist:** `package.json` has `lint` (`next lint`) and `build` (`next build`) — CI calls these directly. `package-lock.json` is committed (required for `npm ci` + setup-node cache).
* **Strict ESLint is active** and will gate CI: `@typescript-eslint/no-explicit-any: error` and `@typescript-eslint/no-unused-vars: error`. The canary code must have **no `any` and no unused vars/imports**, or `npm run lint` (and therefore CI) fails. [Source: .eslintrc.json]
* **App Router, non-`src` layout:** routes live under `app/`. `app/canary/page.tsx` → `/canary`. Server Components are the default (no `"use client"` needed). [Source: _bmad-output/implementation-artifacts/1-1-boilerplate.md]
* **Root layout is un-gated** (`app/layout.tsx`) — no auth/provider wrapping yet, so the canary page is automatically reachable. Don't add gating. The page inherits `bg-background text-foreground` from `<body>`; that's fine.
* **"Tested" definition (carried from 1.1):** no unit-test framework is installed and none should be added (dependency-light). Verification = `lint` clean + `build` clean + `/canary` returns 200 with the payload + the GitHub Actions run is green.

### CI / GitHub specifics (MUST follow)
* **Default branch is `main`, not `master`.** The source story says "master" — that's stale. Target `main` in the `pull_request` trigger. [Verified: `origin/HEAD → origin/main`]
* **Trigger choice matters for verification.** A `pull_request: branches: [main]`-only trigger will NOT run when you push the feature branch (`epic-1`) without opening a PR. Include a `push` trigger (unfiltered, or include the working branch) so AC#1's "verify the pipeline executes before merging" is satisfiable by a plain push. Recommended:
  ```yaml
  on:
    push:
    pull_request:
      branches: [main]
  ```
* **`gh` CLI is available (v2.92)** and is the required tool for GitHub operations on this repo. After pushing, do not guess CI status — confirm it: `gh run list -L 1`, `gh run watch <id> --exit-status`.
* The CI runner installs from scratch, so `npm ci` must succeed against the committed `package-lock.json`. If lint/build pass locally but `npm ci` fails in CI, the lockfile is out of sync — regenerate with `npm install` and commit it.

### `/canary` implementation specifics
* **Static by default:** a Server Component with no dynamic data renders to static HTML at build time. Confirm the build output marks `/canary` with `○ (Static)`. Do not add `export const dynamic = "force-dynamic"`.
* **Payload shape:** render the literal object `{ status: "operational", version: "1.0.0" }`. Keep `version` an inline constant (immutable confirmation string per AC#3) — do NOT read it from `package.json` (which is `0.1.0`); the AC example value is `1.0.0` and the point is a stable, hardcoded health signal.
* **Clean output:** rendering `JSON.stringify(status, null, 2)` inside a `<pre>` is sufficient and matches "minimal JSON payload or clean text block." No styling beyond a minimal container is required.
* **Type cleanly:** give the status object an explicit shape or `as const` so it satisfies strict TS without `any`.

### Architecture notes
* The authoritative architecture doc (`docs/04_System_Architecture_Master_v3.md`) is DB-schema only and imposes no constraints on this story (no DB, no auth yet). [Source: docs/04_System_Architecture_Master_v3.md]
* No UX spec exists (accepted gap); `/canary` is a diagnostic route with no UX requirements. [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-06-17.md#UX Alignment]

### Project Structure Notes
* New files: `.github/workflows/ci.yml`, `app/canary/page.tsx`. No changes to existing files expected.
* `.github/` is NOT covered by `.gitignore` — it will be committed (correct; CI must live in the repo).
* Downstream: this is the last infra story before Epic 2 (auth). When auth/middleware arrives, `/canary` must remain explicitly excluded from any gate — note this for the Epic 2 dev.

### References
- [Source: docs/docs/prd/epic-1/story_01_2_canary.md] — story statement, ACs, tasks, dev notes
- [Source: docs/docs/prd/epic-1/epic_01_overview.md] — CI-on-PR objective, canary health-check rationale
- [Source: _bmad-output/implementation-artifacts/1-1-boilerplate.md] — scaffold state, scripts, strict ESLint, App Router layout
- [Source: .eslintrc.json] — strict rules that gate CI lint
- [Verified: `git symbolic-ref origin/HEAD` → `main`] — default branch is `main`, not `master`

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-dev-story workflow

### Debug Log References

- `npm run lint` → `✔ No ESLint warnings or errors`.
- `npm run build` → `✓ Compiled successfully`; route table lists `○ /canary` (Static).
- `npm run start` + `curl /canary` → `200`; prerendered HTML contains `status: operational` / `version: 1.0.0`.
- Pushed to `epic-1` (`f92aee9`) → GitHub Actions run `27733524611`: `gh run watch --exit-status` → exit 0. Steps green: checkout → setup-node → `npm ci` → lint → build (59s).

### Completion Notes List

- **AC#1 (CI):** `.github/workflows/ci.yml` runs `npm ci` → `npm run lint` → `npm run build` on `push` (all branches) and `pull_request` to `main`, with `actions/setup-node@v4` npm cache keyed on `package-lock.json`. Verified green on GitHub (run `27733524611`) for the pushed commit.
  - Targeted `main` (the actual default branch), not the stale "master" in the source story.
  - Used a `push` trigger (not PR-only) so the feature-branch push verifies CI pre-merge, satisfying the AC's "verify before merging".
  - Non-blocking GitHub annotation: `checkout@v4`/`setup-node@v4` run on the runner's deprecated Node 20 action runtime (unrelated to our app's `node-version: 20`); v4 is current, no change needed.
- **AC#2 (200 OK):** `/canary` returns `200` — confirmed via `curl`. Route is un-gated (no auth/middleware/redirect) and inherits the open root layout.
- **AC#3 (payload):** `/canary` renders `{ "status": "operational", "version": "1.0.0" }` in a `<pre>` block. `version` is a hardcoded immutable constant (`as const`), deliberately NOT read from `package.json` (`0.1.0`), per the AC's "immutable confirmation string".
- **Static guarantee:** plain Server Component with no dynamic APIs → build marks `/canary` as `○ (Static)`. No `dynamic` export added.
- **Strict-lint compliance (carried from 1.1):** no `any`, no unused vars — `status` typed via `as const`. Lint clean.
- **No test framework added** (dependency-light, per Story 1.1 convention). Verification is lint + build + runtime 200/payload + green CI.

### File List

**Added:**
- `.github/workflows/ci.yml`
- `app/canary/page.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Added GitHub Actions CI (lint+build) and static `/canary` health route. Lint/build clean; CI verified green (run 27733524611). Status → review. | Amelia (Dev) |
| 2026-06-18 | 1.2.0 | Code review: no correctness bugs. Applied 1 low-severity efficiency fix — added `concurrency` group to `ci.yml` to collapse push/PR double-runs and cancel superseded runs. Re-verified CI green. Status → done. | Amelia (Dev) |
