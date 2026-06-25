# Story 21.4: Realtime Sync + Regression Verification

Status: ready-for-dev

## Story

As a collaborator, I want even-split changes to sync live and itemized receipts to keep working, so that the new mode is consistent across clients with no regressions.

(Full acceptance criteria: [docs/docs/prd/epic-21/epic_21_overview.md](../../docs/docs/prd/epic-21/epic_21_overview.md#story-214-realtime-sync--regression-verification).)

## Tasks / Subtasks

- [ ] **Sync the even-split fields** (AC: 1, 2) — extend the existing `receipt:${receiptId}` realtime handler to apply inbound `split_mode`, `even_split_among`, and the even-mode total (`amount`), surfaced to the receipt page the same way Story 20.4 surfaces `name`/`paid_by` (the ref-backed `onRemoteFields` callback + parent echo-guard). **No second channel, no migration.**
- [ ] **Echo-guard** (AC: 2) — don't clobber an in-progress local selection/total edit with the echo of the user's own write (mirror the 20.4 / fee guards).
- [ ] **No itemized regression** (AC: 3) — matrix assignment, proportional tax/tip, quantity-split, and settle-up unchanged for `itemized` receipts; the existing suite stays green.
- [ ] **Verification** (AC: 4) — `npm run lint` + `npm run build` + `npm test`; document the two-client manual smoke for the PR preview (even-split across two clients; per-person amount + settle-up; itemless receipt with a manual total).
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **Extend, don't add:** `ReceiptSplitView` already owns the single `receipt:${receiptId}` subscription and (Story 20.4) surfaces `name`/`paid_by` to the detail page via `onRemoteFields`. Add `split_mode`/`even_split_among`/`amount` to that payload + callback rather than opening a new channel. [Source: components/feature/ReceiptSplitView.tsx, Story 20.4]
- **But note the wrinkle:** in even mode the matrix (and thus `ReceiptSplitView`) is hidden (Story 21.3). Decide where the subscription lives when the matrix isn't mounted — either keep a lightweight per-receipt subscription on the detail page, or mount the channel independent of the matrix. Resolve this as the first task; keep it to **one** channel per receipt.
- **No migration** — the columns ride the existing Epic 12 `receipts` publication.

### Project Structure Notes

- Modify `components/feature/ReceiptSplitView.tsx` and/or `app/trips/[id]/receipts/[receiptId]/page.tsx`. No DB change.

### References

- [Source: docs/docs/prd/epic-21/epic_21_overview.md#story-214-realtime-sync--regression-verification]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
