# Story 18.3: Audit & Fix v4 Breaking Utility Changes

Status: done

## Story

As a maintainer, I want components updated for v4's changed default utilities, so that the UI looks the same after the upgrade.

(Full acceptance criteria: [docs/docs/prd/epic-18/epic_18_overview.md](../../docs/docs/prd/epic-18/epic_18_overview.md#story-183-audit--fix-v4-breaking-utility-changes).)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

Audited the codebase against v4's retuned defaults (data-driven — checked the built CSS, not just memory):

- **`shadow-sm` → `shadow-xs`** (5 usages: `app/page.tsx` ×3, `forgot-password`, `reset-password`). v4 shifted the shadow scale (v3 `shadow-sm` is now `shadow-xs`), so this preserves the original small shadow.
- **bare `rounded` (54×) — no change.** Verified v4 still emits `border-radius: .25rem` for bare `.rounded`, identical to v3.
- **bare `border` (56×) — no change.** Every usage pairs an explicit `border-neutral-*`/`border-foreground` color (or is `border-collapse`); none relies on the v3 gray-200 default that v4 changed to `currentColor` (AC3 confirmed).
- **No `rounded-sm`, `outline-none`, bare `ring`, `blur`, or `divide-*`** in the codebase — nothing to migrate there. `shadow-md` (ThemeToggle) is unchanged in v4.
- **Source detection scoped** (`@import "tailwindcss" source(none)` + explicit `@source` for `app`/`components`/`context`/`utils`). v4 auto-scans *all* non-ignored files including Markdown, so class-like strings in `docs/` prose were generating phantom utilities (e.g. a stray `.shadow-sm` from this epic's own overview). This reproduces the v3 `content` array exactly. Verified post-fix: phantom `.shadow-sm` gone, `shadow-xs`/accent/themed/`.dark` rules all still emitted.
- `npm run lint` + `npm run build` + `npm test` (90) clean.

### File List

**Modified:**
- `app/page.tsx`
- `app/forgot-password/page.tsx`
- `app/reset-password/page.tsx`
- `app/globals.css`
