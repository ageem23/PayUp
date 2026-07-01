# Story 22.4: Consolidate theme toggle + badge color into the account page

Status: done

## Story

As a user managing my preferences,
I want the light/dark toggle and my profile badge color to live on my profile page,
so that appearance settings are in one predictable place instead of floating on screen or sitting on the dashboard.

## Acceptance Criteria

1. The account page gains an "Appearance" section containing both the light/dark mode toggle and the profile badge color selector.
2. The floating theme toggle (fixed bottom-right) is removed from global display; the badge-color `ProfileSelector` is removed from the dashboard.
3. Both controls continue to work exactly as before — theme via `useTheme()` / `ThemeContext`, accent via `useAccentColor()` / `AccentColorContext` — including localStorage persistence and existing DB/cross-device sync. No provider or persistence changes.
4. Changing the theme or badge color on the account page takes effect app-wide immediately, and the selected values are reflected when returning to the page.
5. Accessible controls (labels, keyboard focus) and correct rendering in light and dark mode.
6. `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Add an "Appearance" section to `app/account/page.tsx` composing a theme control + the badge-color selector (AC: 1).
- [x] Create `ThemeSetting` — a labeled card theme control using `useTheme` (replaces the floating button's role) (AC: 1, 5).
- [x] Reuse the existing `ProfileSelector` for badge color on the account page (AC: 1, 3).
- [x] Remove `<ThemeToggle />` from `app/layout.tsx` and delete the now-unused `components/ui/ThemeToggle.tsx` (AC: 2).
- [x] Remove `<ProfileSelector />` (and its import) from `app/dashboard/page.tsx` (AC: 2).
- [x] No changes to `ThemeContext` / `AccentColorContext` or persistence (AC: 3, 4).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- Reuses the existing context hooks unchanged — this is purely a relocation of the controls, so persistence and cross-device sync (Epic 15) are unaffected. [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-224]
- `ProfileSelector` (accent/badge) moves from the dashboard to the account page's Appearance section. The floating `ThemeToggle` is replaced by a labeled `ThemeSetting` card; the old component is deleted since it had no other caller.
- Tradeoff (accepted per product): theme is no longer toggleable from every screen — it lives on the account page.

### Project Structure Notes

- Added: `components/feature/ThemeSetting.tsx`. Modified: `app/account/page.tsx`, `app/layout.tsx`, `app/dashboard/page.tsx`. Deleted: `components/ui/ThemeToggle.tsx`.

### References

- [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-224-consolidate-theme-toggle--badge-color-into-the-account-page]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- Added `components/feature/ThemeSetting.tsx`: labeled "Theme" card with a light/dark button driven by `useTheme` (sun/moon icon + label), matching `ProfileSelector`'s card style.
- `app/account/page.tsx`: new "Appearance" section renders `<ThemeSetting />` + `<ProfileSelector />`.
- `app/layout.tsx`: removed the `ThemeToggle` import and its global render.
- `app/dashboard/page.tsx`: removed the `ProfileSelector` import and its dashboard render (banner from 22.3 stays).
- Deleted `components/ui/ThemeToggle.tsx` (no remaining callers). No context/persistence changes.

### File List

**Added:**
- `components/feature/ThemeSetting.tsx`

**Modified:**
- `app/account/page.tsx`
- `app/layout.tsx`
- `app/dashboard/page.tsx`

**Deleted:**
- `components/ui/ThemeToggle.tsx`
