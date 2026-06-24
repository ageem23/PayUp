# Story 20.4: Realtime Sync for Name / Paid-By / Tip / Tax

Status: ready-for-dev

## Story

As a collaborator on a shared receipt,
I want edits to the name, payer, tip, and tax to appear live like the checkboxes,
so that everyone sees a consistent receipt without refreshing.

## Acceptance Criteria

1. Remote edits to the **receipt name** and **paid_by** are reflected live for other viewers (matching the existing realtime checkboxes).
2. Remote edits to **tip** and **tax** are reflected live (confirm/retain the existing behavior).
3. Updates use an **echo-guard** so a user's own in-progress edit (e.g. mid-rename) isn't overwritten by the echo of their own write — mirroring the existing fee/item guards.
4. No duplicate realtime channels per receipt; **no migration** (uses the Epic 12 `receipts` publication).
5. Verified across two clients for each of the four fields.

## Tasks / Subtasks

- [ ] **Locate field ownership** — `ReceiptSplitView` already owns + realtime-syncs `tax`, `tip`, `split_among`, and line items; the **receipt name** and **paid_by** are owned by the receipt detail page (`app/trips/[id]/receipts/[receiptId]/page.tsx`), which currently loads them once.
- [ ] **Extend realtime to name + paid_by** (AC: 1) — apply inbound `name`/`paid_by` from the `receipts` UPDATE payload. Choose one approach and keep a **single channel per receipt** (AC: 4):
  - lift name/paid_by state into `ReceiptSplitView`'s existing `receipt:${receiptId}` subscription, **or**
  - add a matching per-receipt subscription on the detail page that applies name/paid_by (only if it doesn't duplicate the channel).
- [ ] **Echo-guard** (AC: 3) — guard name/paid_by the same way fees are guarded: ignore the inbound echo of the local write, and don't clobber a value the user is mid-edit (e.g. a ref + "skip while local edit in flight" check, as used for fees/items).
- [ ] **Confirm tip/tax** (AC: 2) — verify the existing tax/tip realtime path still works after any refactor.
- [ ] **Two-client verification** (AC: 5) — with two sessions on the same receipt, edit name, paid_by, tip, and tax in one and confirm each appears live in the other, with no flicker/clobber of in-progress edits.
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **Existing realtime (the pattern to follow):** `ReceiptSplitView` subscribes to `supabase.channel(`receipt:${receiptId}`)` on `postgres_changes` (UPDATE, `public.receipts`, `id=eq.${receiptId}`). Its handler applies `processed_data` (line items), `split_among` (matrix), `tax`, and `tip`, each with an **order-insensitive / equality compare** to ignore the echo of the local write, plus a **mid-debounce guard** (`feeTimerRef`/`itemsTimerRef`) so an inbound value can't overwrite what the user is still typing (LWW). [Source: components/feature/ReceiptSplitView.tsx ~L282-348]
- So **tax & tip already sync** — the gap is **name** and **paid_by**, which live on the detail page. The cleanest fix is usually to extend the *one* existing subscription rather than open a second channel for the same receipt (AC4). [Source: app/trips/[id]/receipts/[receiptId]/page.tsx]
- **Echo-guard detail:** the writer's own UPDATE echoes back over the channel; without the compare/guard, applying it can reset the field or interrupt typing. Reuse the existing ref-based guard approach for the rename input and paid_by control.
- **No migration:** `receipts` is already `replica identity full` + in the `supabase_realtime` publication (Epic 12, `0008`), so name/paid_by changes already broadcast — this story is purely about *consuming* them. [Source: Epic 12 — docs/docs/prd/epic-12]

### Project Structure Notes

- Modify `components/feature/ReceiptSplitView.tsx` and/or `app/trips/[id]/receipts/[receiptId]/page.tsx` (depending on the chosen single-channel approach). No DB change.

### References

- [Source: docs/docs/prd/epic-20/epic_20_overview.md#story-204-realtime-sync-for-name--paid-by--tip--tax]
- [Source: components/feature/ReceiptSplitView.tsx — existing receipt realtime subscription]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
