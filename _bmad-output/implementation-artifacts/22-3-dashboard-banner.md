# Story 22.3: Add the full-width PayUp banner to the dashboard

Status: done

## Story

As a signed-in user on the dashboard,
I want the PayUp banner shown on my trips page,
so that the app feels branded and consistent with the login page.

## Acceptance Criteria

1. On the dashboard, the shared `BannerLogo` (from Story 22.1) is rendered beneath the "Your trips" heading + "Create New Trip" button row and above the trips list — same single `/banner.png`, same CSS trim.
2. The banner spans the full width of the dashboard's main container (`max-w-5xl`), is trimmed (no surrounding whitespace), and is not distorted.
3. The banner renders correctly in light and dark mode and on small screens (no overflow/horizontal scroll).
4. No change to trip loading, the "Create New Trip" action, or any other dashboard behavior.
5. `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Import and render `BannerLogo` on the dashboard beneath the heading row, above the (existing) content (AC: 1).
- [x] Size it full width of the `max-w-5xl` main container (AC: 2); the component's `overflow-hidden` clip handles the trim and prevents overflow (AC: 3).
- [x] Leave trip loading and the create action untouched (AC: 4).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- Reuses `BannerLogo` from Story 22.1 — one asset, one CSS trim treatment; only the container width differs (full width here vs `max-w-sm` on login). [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-223]
- Inserted after the "Your trips"/"Create New Trip" row and before the `ProfileSelector`. (Note: Story 22.4 subsequently moves `ProfileSelector` off the dashboard into the account page.)

### Project Structure Notes

- Modified: `app/dashboard/page.tsx`.

### References

- [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-223-add-the-full-width-payup-banner-to-the-dashboard]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- `app/dashboard/page.tsx`: imported `BannerLogo`; rendered `<BannerLogo className="mb-6 w-full" />` beneath the trips heading row, above the trips content.

### File List

**Modified:**
- `app/dashboard/page.tsx`
