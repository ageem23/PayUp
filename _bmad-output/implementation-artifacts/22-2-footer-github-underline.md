# Story 22.2: Persistently underline the footer GitHub links

Status: done

## Story

As a user reading the footer,
I want the "GitHub" and "Getting Started" links to look like links,
so that it's obvious they're clickable without hovering.

## Acceptance Criteria

1. In the footer, the "GitHub" link and the "Getting Started" link are always underlined, not underline-on-hover (`hover:underline` → `underline`).
2. Because the footer is global (root layout), the underline appears on every page — no per-page changes needed.
3. `href`, `target="_blank"`, and `rel="noreferrer"` are unchanged; no other footer content is affected. Underline styling is legible in both light and dark mode.
4. `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Change both footer anchors from `hover:underline` to `underline` (AC: 1).
- [x] Confirm the footer is rendered once in `app/layout.tsx` so all pages inherit the change (AC: 2).
- [x] Leave `href`/`target`/`rel` and all other footer markup untouched (AC: 3).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- Footer is presentational and global (Story 20.1), rendered in `app/layout.tsx`. A single class change covers every page. [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-222]
- The link color (`text-neutral-500` / dark `text-neutral-400`) already reads clearly with an underline in both themes.

### Project Structure Notes

- Modified: `components/ui/Footer.tsx`.

### References

- [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-222-persistently-underline-the-footer-github-links]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- `components/ui/Footer.tsx`: both anchors (`GitHub`, `Getting Started`) now use `underline` instead of `hover:underline`. No other changes.

### File List

**Modified:**
- `components/ui/Footer.tsx`
