---
baseline_commit: d7307be8da6d870eee20cb3c229079e5f58d5f96
---

# Story 9.1: Application Dark-Mode Visual Theme Toggle & Local Storage Synchronization

Status: done

## Story

As a collaborator checking costs late at night,
I want a persistent dark-mode interface toggle,
so that I can split bills comfortably in low-light settings without eye strain.

## Acceptance Criteria

1. A theme switch toggles between light and a high-contrast dark palette.
2. The switch adds/removes the `dark` class on `<html>`.
3. The selected theme is cached in `localStorage`.
4. On load, a script reads the cached theme **before** paint to prevent a bright flash.

## Tasks / Subtasks

- [x] **Theme context** — `context/ThemeContext.tsx`: `ThemeProvider` + `useTheme()` exposing `theme`/`toggleTheme`/`setTheme`; applies the `dark` class to `<html>` and persists to `localStorage` (`THEME_STORAGE_KEY = "app-theme"`, best-effort try/catch). State is synced on mount from the class the inline script already applied (no flash, no toggle mismatch).
- [x] **Dark palette** — `app/globals.css`: a `.dark` block swaps `--background`/`--foreground` and sets `color-scheme: dark`. Because the app is built on `bg-background`/`text-foreground` tokens (and inverted `bg-foreground`/`text-background` buttons), the whole app flips by swapping two variables.
- [x] **`dark:` variants** — added to the handful of hardcoded light surfaces that wouldn't auto-flip: matrix row/column hovers, the OCR skeleton pulse, the upload dropzone, the login Google button + dividers, the participant-chip remove button.
- [x] **Toggle** — `components/ui/ThemeToggle.tsx`: a floating bottom-right sun/moon button (fixed, `z-50`) so it's reachable on every page without a shared header.
- [x] **Anti-flash script** — `app/layout.tsx`: an inline `<head>` script applies the cached theme (or OS preference) before paint (AC4); `<html suppressHydrationWarning>` because the script mutates the class pre-hydration.

## Dev Notes

### Why the CSS-variable approach
`tailwind.config.ts` already had `darkMode: "class"` and variable-driven `background`/`foreground` tokens (seeded for this epic). Swapping the variables in `.dark` flips every semantic surface in one place; only literal `neutral-*` fills/hovers needed explicit `dark:` variants.

### Flash prevention + hydration
The `<head>` script runs before the body paints, so dark setups never flash white (AC4). That pre-hydration class mutation would trip a React hydration warning, so `<html>` uses `suppressHydrationWarning`. The provider reads the already-applied class on mount rather than guessing, keeping the toggle icon correct.

### No tests
Pure theming/UI — no unit-testable logic. "Tested" = `npm run lint` + `npm run build` clean (+ existing suite green).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔; `npm test` → 35 passed (7 suites, unchanged).

### Completion Notes List

- Local self-review pass; BMAD adversarial review runs once on the full epic diff before the PR, then CodeRabbit on the PR.
- No DB/env changes; theme lives entirely in `localStorage`.

### File List

**Added:**
- `context/ThemeContext.tsx`
- `components/ui/ThemeToggle.tsx`

**Modified:**
- `app/layout.tsx` (anti-flash script, ThemeProvider, floating toggle, suppressHydrationWarning)
- `app/globals.css` (`.dark` palette)
- `components/feature/ReceiptMatrix.tsx`, `MatrixRowItem.tsx`, `MatrixStateWrapper.tsx`, `ReceiptUploadZone.tsx`, `app/page.tsx`, `app/dashboard/new/page.tsx` (`dark:` variants)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-19 | 1.0.0 | Class-based dark mode: ThemeContext + floating toggle + localStorage + pre-paint anti-flash script; `.dark` CSS-variable palette and `dark:` variants on hardcoded light surfaces. Lint+build+test green. Merged into `epic-9`. | Amelia (Dev) |
