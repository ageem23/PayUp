# Story 20.3: Remove the Receipt Version History

Status: ready-for-dev

## Story

As a user viewing a receipt,
I want the misleading session-only activity timeline gone,
so that the page doesn't imply a history it can't fully show.

## Acceptance Criteria

1. The activity timeline / version history no longer appears on the receipt page.
2. The component and its data plumbing on the receipt page are removed cleanly — no dead UI, no unused imports, no console errors.
3. No regression to the rest of the receipt page (assignment matrix, fees, totals, realtime sync).
4. Any audit-write code left with **no remaining reader** is noted in the Dev Agent Record for a possible follow-up cleanup (not necessarily removed in this story).

## Tasks / Subtasks

- [ ] **Remove the display** (AC: 1) — delete the `<ActivityTimeline ... />` render from `ReceiptSplitView`.
- [ ] **Remove its data plumbing** (AC: 2) — remove the `auditLog` state/derivation and any fetch/subscription that exists *only* to feed the timeline; drop now-unused imports and props. If `components/feature/ActivityTimeline.tsx` has no other importer after this, delete it.
- [ ] **Don't break realtime/fees** (AC: 3) — the timeline sits alongside the matrix + fees in `ReceiptSplitView`; make sure removing it doesn't disturb the realtime subscription, the fee inputs, or the layout (Story 17.5 single-column stack).
- [ ] **Audit the write side** (AC: 4) — check whether anything still *writes* audit entries (Epic 10 backend) with no reader left; if so, note it for a follow-up rather than expanding scope here.
- [ ] `npm run lint` + `npm run build` + `npm test` clean (remove/adjust any ActivityTimeline-specific tests).

## Dev Notes

- **`<ActivityTimeline entries={auditLog} />` renders in `ReceiptSplitView`** (toward the end of the component, after the matrix/fees block). [Source: components/feature/ReceiptSplitView.tsx]
- The component is `components/feature/ActivityTimeline.tsx` (Epic 10, Story 10.1). Its only consumer is the receipt split view, so removing the render likely makes the component and its read path dead. [Source: Epic 10 — docs/docs/prd/epic-10]
- **Product rationale:** the timeline only reflects the **current session's** actions (it isn't backed by a durable per-session history read), so it reads as incomplete — hence removing the display rather than trying to make it complete.
- **Scope guard:** remove the *display + read path*. Leaving Epic 10's audit-write backend in place is the lowest-risk choice; flag dead writes for later. Don't remove DB tables/migrations in this story.

### Project Structure Notes

- Modify `components/feature/ReceiptSplitView.tsx`; delete `components/feature/ActivityTimeline.tsx` if unreferenced. No DB change.

### References

- [Source: docs/docs/prd/epic-20/epic_20_overview.md#story-203-remove-the-receipt-version-history]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
