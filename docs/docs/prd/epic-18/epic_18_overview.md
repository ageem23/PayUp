# Epic 18: Tailwind CSS v4 Migration

## Overview
Dependabot PR **#27** bumps `tailwindcss` 3 → 4, and it **fails CI**: Tailwind v4 is a ground-up rewrite, not a drop-in. The build breaks immediately because the PostCSS plugin moved out of the `tailwindcss` package:

> Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package … install `@tailwindcss/postcss`.

Beyond the toolchain swap, v4 replaces the JS `tailwind.config.ts` with a **CSS-first** config (`@theme`), changes how dark mode and content detection work, and renames/retunes a set of default utilities. This epic migrates PayUp to Tailwind v4 cleanly — preserving the existing look (light/dark theming, accent colors, the cell-flash animation) — and lands (or supersedes) #27 with green CI.

**What's affected in this repo (the migration surface):**
- `postcss.config.mjs` — uses `tailwindcss: {}` as a PostCSS plugin (must become `@tailwindcss/postcss`).
- `app/globals.css` — uses `@tailwind base; @tailwind components; @tailwind utilities;` (must become `@import "tailwindcss";`) plus the `:root` / `.dark` CSS-variable theme.
- `tailwind.config.ts` — JS config with `darkMode: "class"`, `content` globs, `theme.extend.colors` (`background`/`foreground` → CSS vars), and the `cellFlash` keyframes + `flash-cell` animation (Epic 10). All of this must move to CSS `@theme` / `@keyframes` (or a v4 `@config` shim).
- **Dynamic accent classes (Epic 9, Story 9.2)** — `utils/` holds accent-color class *strings* consumed via variables; v3 needed them in `content` to avoid JIT purge. v4's automatic source detection + the no-arbitrary-string rule make this the **highest-risk** area: dynamically composed class names can be dropped.
- Component utilities across `app/` and `components/` that rely on **v3 default values** Tailwind v4 changed (see 18.3).

No database, API, or product-behavior changes — this is styling/tooling only. The acceptance bar is **visual parity** with today plus green `lint`/`build`/`test`.

## Target Approach & Technical Notes
* **Toolchain & entrypoint (18.1):** add `@tailwindcss/postcss`, point `postcss.config.mjs` at it, bump `tailwindcss` to v4, and switch `globals.css` to `@import "tailwindcss";`. Goal: the build compiles on v4 before any cosmetic refinement.
* **CSS-first theme port (18.2):** translate `tailwind.config.ts` into CSS. `theme.extend.colors.{background,foreground}` → `@theme { --color-background: var(--background); --color-foreground: var(--foreground); }`; the `cellFlash` keyframes + `flash-cell` animation → a `@keyframes` block + `@theme { --animate-flash-cell: …; }`. **Dark mode is the trap:** v4 defaults to `prefers-color-scheme`, but PayUp toggles a `.dark` class via JS (Epic 9 ThemeContext). Class-based dark mode must be re-declared, e.g. `@custom-variant dark (&:where(.dark, .dark *));`, or every `dark:` utility silently follows the OS instead of the toggle.
* **Preserve dynamic accent classes (18.2/18.3):** verify the Story 9.2 accent palette still renders under v4 source detection; safelist via an explicit `@source inline(...)` / safelist mechanism if auto-detection drops the dynamically built class names. This is the single most likely regression — test the accent picker end to end.
* **Breaking-utility audit (18.3):** v4 retuned several defaults. Audit and fix where the repo relies on v3 behavior — known ones to grep for: `shadow-sm` (v4 renames v3's `shadow-sm`→`shadow-xs`; bare `shadow`→`shadow-sm`), `rounded-sm`/bare `rounded` (similar rename), bare `border`/`ring` (default color became `currentColor`; ring width 3px→1px), and `outline-none` (→ `outline-hidden`). The repo uses explicit `border-neutral-*` (good) but does use `shadow-sm`, `rounded*`, and focus styles — confirm each renders the same.
* **No `@config` long-term:** prefer porting fully to CSS-first `@theme`. A temporary `@config "./tailwind.config.ts";` shim is acceptable as a stepping stone in 18.1 but should be removed by the end of 18.2 so there's one source of truth.
* **No migration numbers** — this epic touches no SQL/DB.
* **Dependabot:** this work supersedes **#27**. Either rebase #27 onto the migration or close it in favor of the epic branch; don't merge #27 as-is.

## Epic Backlog Registry
* **Story 18.1:** Toolchain & Entrypoint Swap (PostCSS plugin + `@import "tailwindcss"`, build green on v4)
* **Story 18.2:** Port Theme to CSS-First `@theme` (colors, animation, class-based dark variant, accent classes)
* **Story 18.3:** Audit & Fix v4 Breaking Utility Changes (shadow/rounded/border/ring/outline defaults)
* **Story 18.4:** Visual-Parity Regression Verification + Land/Supersede #27

**Sequencing note:** strictly ordered. 18.1 gets the build compiling on v4; 18.2 restores theming (and is where dark mode / accent regressions surface); 18.3 cleans up cosmetic drift from changed defaults; 18.4 is the QA gate. Treat 18.2's dark-mode + accent items as the highest-risk work.

---

## Story 18.1: Toolchain & Entrypoint Swap
**As a** maintainer,
**I want** the project building on Tailwind v4's toolchain,
**so that** the rest of the migration has a compiling baseline.

### Acceptance Criteria
1. `@tailwindcss/postcss` is installed and `postcss.config.mjs` uses it instead of `tailwindcss: {}`.
2. `tailwindcss` is on v4; `app/globals.css` uses `@import "tailwindcss";` in place of the three `@tailwind` directives.
3. `npm run build` compiles (the #27 PostCSS error is gone). A temporary `@config "./tailwind.config.ts";` shim is acceptable here to keep styles working before 18.2.
4. `npm run lint` + `npm run build` + `npm test` pass.

## Story 18.2: Port Theme to CSS-First `@theme`
**As a** maintainer,
**I want** the theme defined in CSS the v4 way,
**so that** there's a single source of truth and the app keeps its current theming.

### Acceptance Criteria
1. `theme.extend.colors.background`/`foreground` are expressed as `@theme` tokens backed by the existing `--background`/`--foreground` CSS variables; `bg-background`, `text-foreground`, `bg-foreground`, `text-background` all still resolve.
2. The `cellFlash` keyframes and `flash-cell` animation (Epic 10) are ported to CSS; the cell-flash highlight still plays.
3. **Class-based dark mode works**: toggling the `.dark` class still flips every themed surface (a `@custom-variant dark` — or equivalent — is declared so v4 doesn't fall back to `prefers-color-scheme`).
4. The **Epic 9 accent-color** classes still render (the dynamically composed accent strings are not purged by v4 source detection); the accent picker visibly changes accents as before.
5. The `tailwind.config.ts` `@config` shim from 18.1 is removed (CSS-first is the single source of truth) — or, if retained, justified in the Dev Agent Record.
6. `npm run lint` + `npm run build` + `npm test` pass.

## Story 18.3: Audit & Fix v4 Breaking Utility Changes
**As a** maintainer,
**I want** components updated for v4's changed default utilities,
**so that** the UI looks the same after the upgrade.

### Acceptance Criteria
1. The codebase is audited for utilities whose meaning/value changed in v4 — at minimum `shadow-sm`/`shadow`, `rounded-sm`/`rounded`, bare `border`/`ring` (default color + ring width), and `outline-none` → `outline-hidden`.
2. Each affected usage is updated to preserve its current rendering (e.g. v3 `shadow-sm` → v4 `shadow-xs` where the smaller shadow was intended).
3. No bare `border`/`ring` relies on the old default color (the repo already uses explicit `border-neutral-*`; confirmed, or fixed).
4. `npm run lint` + `npm run build` + `npm test` pass.

## Story 18.4: Visual-Parity Regression Verification + Land/Supersede #27
**As a** maintainer,
**I want** a deliberate visual check across the app,
**so that** the v4 migration ships without UI regressions.

### Acceptance Criteria
1. Manual visual QA at mobile and desktop widths covering: dashboard, new-trip form (participant chips), trip page (participants, completion control), receipt detail (image → matrix → fees), and settle-up.
2. **Light and dark** themes both verified, plus at least two **accent colors**, plus the **cell-flash** animation.
3. `npm run lint` + `npm run build` + `npm test` green on the epic branch / PR.
4. Dependabot **#27** is resolved (closed as superseded by this epic, or rebased onto it) — not merged as-is.
