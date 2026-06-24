# Story 19.4: Post-Upgrade Regression Verification + Supersede #28/#29/#30

Status: done

## Story

As a maintainer, I want the upgraded app verified across its key flows, so that Next 16 ships without regressions and the Dependabot PRs are closed out.

(Full acceptance criteria: [docs/docs/prd/epic-19/epic_19_overview.md](../../docs/docs/prd/epic-19/epic_19_overview.md#story-194-post-upgrade-regression-verification--supersede-282930).)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- **Full suite green on Next 16.2.9 / React 19.2.7 / ESLint 10:** `npm run lint` (flat config, exit 0) + `npm run build` (Turbopack) + `npm test` (90) — confirmed locally and via CI on the `epic-19` push.
- **`tsconfig.json` committed** — Next 16's `writeConfigurationDefaults` rewrote it on build: `jsx: "preserve"` → `"react-jsx"` and added the `.next/dev/types/**/*.ts` include (the new concurrent dev/build output dir). Build, types, lint, and tests all pass with it; committing stops the recurring auto-generated diff (same rationale as the earlier `target: ES2017` change).
- **Manual smoke — to run on the PR's Vercel preview** (can't be driven from CI). Suggested checklist:
  - [ ] Sign in with **Google** and **email/password**; `/auth/callback` redirects correctly.
  - [ ] **OCR**: add a receipt, confirm Gemini scan populates items/tax/tip.
  - [ ] **Realtime**: open a trip in two clients, toggle an assignment — the matrix updates live.
  - [ ] **Settle-up** totals and minimal-transfer output look correct.
  - [ ] Remote **images** (avatars, receipt photos) load (Next 16 image-default changes are behavioral only).
- **Dependabot #28 (eslint 10), #29 (next 16), #30 (eslint-config-next 16)** are all superseded by this epic and should be closed — handled at the epic PR.

### File List

**Modified:**
- `tsconfig.json` (Next 16 auto-generated defaults)
