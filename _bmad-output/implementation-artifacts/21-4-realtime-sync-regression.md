# Story 21.4: Realtime Sync + Regression Verification

Status: done

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

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- **Resolved the "where does the one channel live" wrinkle:** the matrix (`ReceiptSplitView`, which owns the `receipt:${id}` channel) and the even-split panel are **mutually exclusive** (one mode per receipt), so:
  - *Itemized mode:* `ReceiptSplitView`'s existing channel now also surfaces `split_mode`/`even_split_among`/`amount` via `onRemoteFields` (extended payload + Props type).
  - *Even mode:* a detail-page `useEffect` (gated on `evenModeActive`) owns a per-receipt subscription that applies the same fields. Since the two never mount together, there is **never more than one channel per receipt** at a time, and a remote mode-switch cleanly hands the channel off (the inbound `split_mode` flips the UI, unmounting one subscription and mounting the other).
- **Echo-guard:** `handleRemoteFields` (Story 20.4) extended to apply `split_mode`/`even_split_among`/`amount` only when `!savingMode` (don't clobber an in-progress local mode/selection edit) and only when changed (order-insensitive compare for `even_split_among`); returns `prev` unchanged otherwise (ignores the echo). A latest-callback ref keeps the even-mode effect from re-subscribing on guard-state changes.
- **No itemized regression:** matrix/tax/tip/quantity-split/settle-up unchanged; the 98-test suite (incl. the Epic 21 ledger tests) stays green. No migration (the columns ride the Epic 12 `receipts` publication).
- `npm run lint` (exit 0) + `npm run build` + `npm test` (98) clean. Two-client manual smoke is checklisted for the PR preview.

### File List

**Modified:**
- `components/feature/ReceiptSplitView.tsx`
- `app/trips/[id]/receipts/[receiptId]/page.tsx`
