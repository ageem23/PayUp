# Story 22.6: Add a "← Dashboard" back link to the new-trip page

Status: done

## Story

As a user on the new-trip page,
I want a "← Dashboard" link in the top-left like the rest of the app,
so that I can go back without using the browser's back button.

## Acceptance Criteria

1. The new-trip page (`/dashboard/new`) shows a top-left "← Dashboard" link that navigates to `/dashboard`.
2. It matches the existing back-link pattern used on the account and trip pages (`text-sm text-neutral-500 underline`, "← Dashboard" label).
3. The link sits above the "New trip" heading; page layout/spacing stays clean.
4. No change to trip creation, participants entry, or any other behavior.
5. `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Import `Link` from `next/link` on the new-trip page (AC: 1).
- [x] Add a "← Dashboard" link above the heading, matching the account/trip-page style (AC: 1, 2, 3); nudge the heading margin (`mt-8` → `mt-4`) so the link has room.
- [x] Leave the form and creation logic untouched (AC: 4).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- Reuses the exact back-link markup already used on `app/account/page.tsx` and `app/trips/[id]/page.tsx` for consistency. [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-226]
- Follow-up UX feedback surfaced after the initial five stories; added to Epic 22 so it ships in the same PR.

### Project Structure Notes

- Modified: `app/dashboard/new/page.tsx`.

### References

- [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-226-add-a--dashboard-back-link-to-the-new-trip-page]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- `app/dashboard/new/page.tsx`: imported `Link`; added `<Link href="/dashboard" …>← Dashboard</Link>` above the "New trip" heading; heading margin `mt-8` → `mt-4`. No logic changes.

### File List

**Modified:**
- `app/dashboard/new/page.tsx`
