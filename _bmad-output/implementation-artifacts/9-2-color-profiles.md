---
baseline_commit: 3edaa7ebf871f6e2e664801ba7c2be0325c1f62d
---

# Story 9.2: Local Participant Profile Color-Coded Avatar Selection UI

Status: done

## Story

As a bill collaborator,
I want to select a personalized accent color badge,
so that my checkbox selections are color-coded and distinguishable.

## Acceptance Criteria

1. A "My Profile Badge" sub-panel in the dashboard workspace.
2. A selection of high-contrast accent color circles (Indigo, Emerald, Rose, Amber, Cyan).
3. Selecting a color maps the token to the active user's config.
4. Checking an item on the matrix renders the check using the chosen color token.

## Tasks / Subtasks

- [x] **Color dictionary** — `utils/profile/accentColors.ts`: a fixed allow-list (`ACCENT_COLORS`) with **literal** Tailwind class strings (`accent-indigo-600`, `bg-indigo-600`, …) so the JIT keeps them; `isAccentToken` (validation) + `accentClass` (token → class, default fallback).
- [x] **State sync** — `context/AccentColorContext.tsx`: `AccentColorProvider` + `useAccentColor()`; persists to `localStorage` (`app-accent-color`), reads the saved choice on mount, exposes `accentClassName`.
- [x] **Selector UI** — `components/feature/ProfileSelector.tsx`: an accessible `radiogroup` of color swatches on the dashboard, selected swatch ringed.
- [x] **Checkbox tint** — `components/feature/MatrixRowItem.tsx`: the checkbox now uses `accentClassName` instead of `accent-foreground`, so the local user's checks render in their accent.
- [x] **Wire** — `AccentColorProvider` added to `app/layout.tsx`; `ProfileSelector` rendered under the dashboard header.
- [x] **Test** — `tests/unit/accentColors.test.ts` (3 tests): allow-list validation, token→literal-class mapping (+ regex that the class is literal), default fallback.

## Dev Notes

### Static class strings (Tailwind JIT)
Accent classes are written out literally in the dictionary and never built as `accent-${token}` — dynamic strings would be purged from the production CSS. A regex test guards that the class strings stay literal.

### Scope: local single-user accent
The spec frames this for "concurrent collaborative" distinction, but multi-user identity/realtime is **Epic 12**. Here the accent is the **local** user's signature (one accent in `localStorage`) applied to the checks they toggle — the honest local-only interpretation. Per-user color mapping arrives with realtime (Epic 12).

### No DB/env
Selection lives entirely in `localStorage`, mirroring the dark-mode persistence (9.1).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔; `npm test` → 38 passed (8 suites).

### Completion Notes List

- Local self-review pass; BMAD adversarial review runs once on the full epic diff before the PR, then CodeRabbit on the PR.

### File List

**Added:**
- `utils/profile/accentColors.ts`
- `context/AccentColorContext.tsx`
- `components/feature/ProfileSelector.tsx`
- `tests/unit/accentColors.test.ts`

**Modified:**
- `app/layout.tsx` (AccentColorProvider)
- `app/dashboard/page.tsx` (ProfileSelector panel)
- `components/feature/MatrixRowItem.tsx` (accent-tinted checkbox)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-20 | 1.0.0 | Local accent-color profile: allow-listed palette + context (localStorage) + dashboard selector; matrix checkboxes tinted by the chosen accent; 3-test suite. Lint+build+test green. Merged into `epic-9`. | Amelia (Dev) |
