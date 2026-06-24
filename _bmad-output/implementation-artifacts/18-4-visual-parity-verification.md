# Story 18.4: Visual-Parity Regression Verification + Land/Supersede #27

Status: done

## Story

As a maintainer, I want a deliberate check across the app, so that the v4 migration ships without UI regressions.

(Full acceptance criteria: [docs/docs/prd/epic-18/epic_18_overview.md](../../docs/docs/prd/epic-18/epic_18_overview.md#story-184-visual-parity-regression-verification--landsupersede-27).)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

**Automated verification (epic-18):**
- `npm run lint` + `npm run build` + `npm test` (90) all green.
- v3 artifacts removed: `tailwind.config.ts` deleted, zero `@tailwind` directives, `postcss.config.mjs` on `@tailwindcss/postcss`.
- Built-CSS coverage confirmed for every themed/animation/accent class used across the key flows: `bg-background`, `bg-foreground`, `text-foreground`, `text-background`, `shadow-xs`, `shadow-md`, `rounded-lg`, `rounded-full`, `border-dashed`, `animate-flash-cell`, and all five accents (`accent-{indigo,emerald,rose,amber,cyan}-*`).

**Manual visual QA — to run on the PR's Vercel preview** (pixel-level rendering can't be driven from CI). Suggested checklist:
- [ ] Dashboard, new-trip form (participant chips), trip page (participants + completion control), receipt detail (image → matrix → fees), settle-up — at mobile and desktop widths.
- [ ] Toggle **light/dark** — every surface flips (the `@custom-variant dark` carries the `.dark` class).
- [ ] Pick at least **two accent colors** in profile — swatches + checkbox `accent-*` update.
- [ ] Trigger a live cell update — the **flash-cell** highlight still pulses.

**Dependabot #27** is superseded by this epic (the same v3→v4 bump, done properly) and should be closed rather than merged — handled at the epic PR.

### File List

_Verification only — no code changes in this story (the migration landed in 18.1–18.3)._
