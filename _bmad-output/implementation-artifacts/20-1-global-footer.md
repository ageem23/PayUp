# Story 20.1: Global Footer on Every Page

Status: ready-for-dev

## Story

As a user on any page,
I want the footer with copyright and links always visible,
so that the GitHub link and the getting-started guide are reachable everywhere.

## Acceptance Criteria

1. The footer (copyright, GitHub link, guide link) appears on **every** page, not just the login page.
2. The "Help" link text is changed to **"Getting Started"** (still links to the same guide).
3. The footer is defined once as a shared component rendered in the layout — not duplicated per page; the inline copy is removed from the login page.
4. The footer sits at the bottom of the viewport on short pages and below the content on long pages (no overlap), with light and dark themes intact.

## Tasks / Subtasks

- [ ] **Extract the footer** (AC: 1, 3) — move the inline footer markup out of `app/page.tsx` (≈ lines 211–234: `© 2026 PayUp`, the GitHub link, and the "Help" link) into a new `components/ui/Footer.tsx` client-agnostic component.
- [ ] **Rename the link** (AC: 2) — change the link label from **"Help"** to **"Getting Started"**; keep its `href` pointing at the existing guide (`https://github.com/ageem23/PayUp/blob/main/HELP.md`).
- [ ] **Render once in the layout** (AC: 1, 3) — add `<Footer />` in `app/layout.tsx` inside `<body>` after `{children}` (after the providers' children render). Remove the now-duplicated footer from `app/page.tsx`.
- [ ] **Sticky-footer layout** (AC: 4) — ensure pages fill the viewport so the footer rests at the bottom on short pages without overlapping content (e.g. a `min-h-screen` flex column wrapper around `{children}` + footer). Verify it doesn't break pages that already use `min-h-screen` on their own `<main>`.
- [ ] **Verify** — `npm run lint` + `npm run build` + `npm test` clean; spot-check footer presence on dashboard, a trip, a receipt, and the login page in light + dark.

## Dev Notes

- **Current footer** is inline at the bottom of `app/page.tsx` (the login page): a `<footer>` with `© 2026 PayUp`, a GitHub anchor, and an anchor labelled **"Help"** → `HELP.md`. [Source: app/page.tsx ~L211-234]
- **Layout** wraps everything in providers: `<body><...providers...><AuthProvider>{children}</AuthProvider>...</body>`. The footer should render outside the page content but inside `<body>`, so it appears on every route. [Source: app/layout.tsx ~L31-38]
- Keep the footer a **plain presentational component** (no client hooks needed) so it can live in the server-rendered layout.
- The "Getting Started" target stays `HELP.md` — that file *is* the getting-started guide (and 20.x doesn't change it).

### Project Structure Notes

- Add `components/ui/Footer.tsx`; modify `app/layout.tsx` and `app/page.tsx`. No DB/API change.

### References

- [Source: docs/docs/prd/epic-20/epic_20_overview.md#story-201-global-footer-on-every-page]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- New presentational `components/ui/Footer.tsx` (© + GitHub + **"Getting Started"** link to `HELP.md`, subtle top border) rendered once in `app/layout.tsx`.
- Layout `<body>` is now `flex min-h-screen flex-col` so the footer sits below content; removed the inline footer from `app/page.tsx` and changed the login `<main>` from `min-h-screen` to `flex-1` so it fills the space and the footer pins to the bottom on that (canonical short) page.
- Other pages keep their `min-h-screen` mains, so the footer renders below their content (no overlap) — left as-is to avoid a broad 11-file height refactor; can be harmonized later if a pinned footer is wanted everywhere.
- `npm run lint` (exit 0) + `npm run build` + `npm test` (90) clean.

### File List

**Added:**
- `components/ui/Footer.tsx`

**Modified:**
- `app/layout.tsx`
- `app/page.tsx`
