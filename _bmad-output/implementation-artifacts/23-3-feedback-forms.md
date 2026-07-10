# Story 23.3: "Report an error" & "Suggest a feature" forms

Status: done

## Story

As a beta tester who hit a problem or has an idea,
I want to describe it in a quick form,
so that the team gets my report with the context of where I was.

## Acceptance Criteria

1. The help menu's "Report an error" and "Suggest a feature" actions each open the same modal component (parameterized by `kind`), with a message `textarea`, a title/label reflecting the kind, and submit/cancel.
2. On submit, `submitFeedback` records the `kind`, message, current path (`usePathname`), a `context` of the receipt/trip in view (route params on `/trips/[id]` and `/trips/[id]/receipts/[receiptId]`), and the user agent.
3. Clear success confirmation and a non-blocking error state; empty messages rejected client-side.
4. The row lands in `feedback_reports` under the submitting user with the correct `kind`; nothing sensitive beyond the user's own message/context is stored.
5. A failed submit never crashes the app or the widget. `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Build `components/feature/FeedbackModal.tsx` (shared, `kind`-parameterized): textarea, kind-specific title/placeholder/CTA, submit/cancel, `Esc`/backdrop close, focus on open (AC: 1).
- [x] Capture context: `usePathname` + `contextFromPath` (trip/receipt ids parsed from the path, since the widget is in the root layout) → `submitFeedback` (AC: 2, 4).
- [x] Success ("Thanks — your report/suggestion was sent") + non-blocking error states; reject empty messages (AC: 3, 5).
- [x] Unit-test `contextFromPath` (AC: 2).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- The widget lives in `app/layout.tsx`, so `useParams` can't see trip/receipt ids — parse them from `usePathname` via `contextFromPath` instead. [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-233]
- Submission uses the best-effort `submitFeedback` from 23.1; a failure surfaces an inline "Couldn't send" and never throws.

### Project Structure Notes

- Added: `components/feature/FeedbackModal.tsx`, `tests/unit/feedbackContext.test.ts`. (Wired to `HelpWidget` from 23.2.)

### References

- [Source: docs/docs/prd/epic-23/epic_23_overview.md#story-233-report-an-error--suggest-a-feature-forms]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- `FeedbackModal.tsx`: one modal for both kinds via a `COPY` map (title/placeholder/CTA/noun). Captures `path` + `contextFromPath(path)` (trip_id / receipt_id) and calls `submitFeedback`. Focus-on-open, `Esc`/backdrop close, success screen, inline error for both empty-input and send-failure. Exports `contextFromPath` for testing.
- `tests/unit/feedbackContext.test.ts`: trip page, receipt page, and off-route cases.

### File List

**Added:**
- `components/feature/FeedbackModal.tsx`
- `tests/unit/feedbackContext.test.ts`
