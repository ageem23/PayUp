# Story 23.2: Floating help widget + menu

Status: done

## Story

As a beta tester,
I want a help button always within reach,
so that I can find help or report a problem from any page.

## Acceptance Criteria

1. A floating button is fixed bottom-right on every page (mounted in `app/layout.tsx`), in the corner the old `ThemeToggle` used.
2. Clicking it opens a small pop-up menu with: Getting Started (shared `HELP.md` URL), Report an error, and Suggest a feature. (Report actions wired in 23.3.)
3. Accessible: keyboard-openable, `Esc` closes, click-outside closes, focus managed, `aria` attributes.
4. Renders correctly in light and dark mode; doesn't obscure critical UI on small screens.
5. `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Add `utils/links.ts` with `GITHUB_URL` + `GETTING_STARTED_URL`; refactor the footer to consume them (AC: 2).
- [x] Build `components/feature/HelpWidget.tsx`: fixed bottom-right button + pop-up menu (Getting started link, Report an error, Suggest a feature) with `Esc`/outside-click close and `aria-haspopup`/`aria-expanded`/`role="menu"` (AC: 1–4).
- [x] Mount `<HelpWidget />` in `app/layout.tsx` (AC: 1).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- Reuses the bottom-right corner freed by removing `ThemeToggle` in Epic 22 (Story 22.4). [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-232]
- The two report actions open `FeedbackModal` (Story 23.3) via `feedbackKind` state; the widget owns the open/close state.

### Project Structure Notes

- Added: `utils/links.ts`, `components/feature/HelpWidget.tsx`. Modified: `components/ui/Footer.tsx`, `app/layout.tsx`.

### References

- [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-232-floating-help-widget--menu]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- `utils/links.ts`: shared `GITHUB_URL` / `GETTING_STARTED_URL`; footer now imports them (single source for the Getting Started target).
- `HelpWidget.tsx`: fixed bottom-right help button (`?` icon), toggles a `role="menu"` popover with Getting started (link) + Report an error + Suggest a feature (buttons). Closes on `Esc` and outside click; `aria-haspopup="menu"` / `aria-expanded`. The two buttons set `feedbackKind` and open `FeedbackModal` (23.3).
- Mounted in `app/layout.tsx` alongside the footer.

### File List

**Added:**
- `utils/links.ts`
- `components/feature/HelpWidget.tsx`

**Modified:**
- `components/ui/Footer.tsx`
- `app/layout.tsx`
