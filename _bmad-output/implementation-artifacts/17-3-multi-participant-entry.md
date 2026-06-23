# Story 17.3: Quick Multi-Participant Entry

Status: ready-for-dev

## Story

As a person setting up a trip,
I want to add several participants at once by typing names separated by spaces,
so that I don't have to add them one at a time.

## Acceptance Criteria

1. On trip creation, entering space-separated text adds **each token as a separate participant**.
2. Extra/leading/trailing whitespace is ignored; empty tokens are skipped; duplicates are de-duplicated.
3. Parsed participants are shown as editable items (chips/list) **before** the trip is created, so the user can remove or correct any entry.
4. A multi-word name splits into multiple entries by design; because the parsed result is visible and editable, the user can fix it (delete the extra and rename).
5. The created trip's `participants` array contains exactly the reviewed set.

## Tasks / Subtasks

- [ ] **Parse on whitespace** (AC: 1, 2) — in the new-trip form, split the participant input on `/\s+/`, trim, drop empties, and de-duplicate (case-insensitive match recommended) before adding to the participant list.
- [ ] **Editable parsed chips** (AC: 3, 4) — render each parsed name as a removable chip/list item; the user can delete any entry (and re-type to fix an over-split multi-word name) prior to submit.
- [ ] **Submit the reviewed set** (AC: 5) — the created trip's `participants` JSONB array is exactly what's shown in the chips at submit time.
- [ ] **Client-only** — no schema/API change; this is form UX on the existing `participants` array.
- [ ] `npm run lint` + `npm run build` + `npm test` clean (add/adjust a unit test for the parse/dedupe helper).

## Dev Notes

- **`participants` is a JSONB array of name strings** on `trips` (labels used for `paid_by` and item splitting) — not auth users. This story only changes how those strings are entered. [Source: docs/04_System_Architecture_Master_v3.md#1-definitive-database-schema]
- **The space-delimiter is an explicit product choice** — multi-word names ("Mary Anne") intentionally split; the editable chips (AC3/AC4) are what make that acceptable, so don't skip the review step. [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-173-quick-multi-participant-entry]
- Keep the parse/dedupe logic in a small pure helper so it's unit-testable and reusable by 17.4 (in-trip add).

### Project Structure Notes

- Modify `app/dashboard/new/page.tsx` (participant entry). Consider a shared `utils/participants.ts` parse/dedupe helper reused by 17.4.

### References

- [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-173-quick-multi-participant-entry]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
