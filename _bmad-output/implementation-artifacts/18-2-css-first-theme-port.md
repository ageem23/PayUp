# Story 18.2: Port Theme to CSS-First `@theme`

Status: done

## Story

As a maintainer, I want the theme defined in CSS the v4 way, so that there's a single source of truth and the app keeps its current theming.

(Full acceptance criteria: [docs/docs/prd/epic-18/epic_18_overview.md](../../docs/docs/prd/epic-18/epic_18_overview.md#story-182-port-theme-to-css-first-theme).)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Ported `tailwind.config.ts` into `app/globals.css` `@theme`:
  - `--color-background` / `--color-foreground` → `var(--background)` / `var(--foreground)`, preserving the `:root`/`.dark` variable-swap (so `bg-background`/`text-foreground`/`bg-foreground`/`text-background` still flip with the theme).
  - `cellFlash` keyframes + `--animate-flash-cell` (Epic 10) nested in `@theme`.
- **Class-based dark mode**: declared `@custom-variant dark (&:where(.dark, .dark *));` — v4 defaults `dark:` to `prefers-color-scheme`, which would have broken the ThemeContext `.dark` toggle.
- **Removed** the 18.1 `@config` shim **and deleted `tailwind.config.ts`** — CSS-first is now the single source of truth (the `MODULE_TYPELESS_PACKAGE_JSON` warning is gone).
- **Accent classes (Epic 9.2) preserved with no safelist**: they're literal full strings in `utils/profile/accentColors.ts`, which v4's automatic source detection scans. Verified against the built CSS: `bg-background` (×49), `.bg-foreground`/`.text-foreground`/`.text-background`, `cellFlash`, 67 `.dark` rules, and all five accents (`bg-*` + `accent-*`) are emitted.
- `npm run lint` + `npm run build` + `npm test` (90) clean.

### File List

**Modified:**
- `app/globals.css`

**Deleted:**
- `tailwind.config.ts`
