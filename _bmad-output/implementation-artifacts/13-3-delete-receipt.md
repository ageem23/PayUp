---
baseline_commit: fa064885f3b555ce0a0dc74bc935ddbb840f3922
---

# Story 13.3: Delete Receipt

Status: done

## Story

As a trip owner or member,
I want to delete a receipt from a trip,
so that mistakes and duplicates don't pollute the settle-up.

## Acceptance Criteria

1. A delete action is available per receipt (from the list and/or the detail view).
2. Deleting requires explicit user confirmation.
3. On confirm, the receipt row is removed and its stored image is cleaned up from the `receipt-images` bucket.
4. Authorization is enforced server-side (not UI-only): the trip owner and approved members (`is_trip_member`) may delete; non-members cannot.
5. The receipt list and the settle-up ledger recompute without the deleted receipt.
6. Other connected clients see the receipt disappear via the Epic 12 realtime channel.

## Tasks / Subtasks

- [x] `deleteReceipt(receiptId, imageUrl)` util: RLS-enforced row delete (with affected-rows guard), then best-effort storage image cleanup; `storagePathFromPublicUrl` parses the bucket object path from a public URL. (AC3, AC4)
- [x] Per-row delete control in `ReceiptList` with a two-step inline confirm (trash → Confirm/Cancel), busy + error states keyed by receipt id. (AC1, AC2)
- [x] `onDeleted` callback → trip page `refreshReceipts()` re-fetches receipts (no full-page loading flash); the ledger `useMemo` recomputes from the new list. (AC5)
- [x] Trip-page realtime subscription on `receipts` filtered by `trip_id` (event `*`) → `refreshReceipts()`, so deletes/inserts propagate to other clients. (AC6)
- [x] `npm run lint` + `npm run build` clean.

## Dev Notes

### No migration — RLS already authorizes delete
Both receipts policies are `for all`: "Owners can manage receipts" (0004) and "Members can manage receipts" via `is_trip_member` (0007). `for all` includes DELETE, so `delete().eq("id", …)` is authorized for the owner and approved members and denied for everyone else — server-side, exactly as AC4 requires. The util's affected-rows check turns an RLS denial (which returns `error: null, data: []`) into a thrown error so the UI doesn't falsely claim success.

### Delete order: row first, image best-effort
The row delete is the authoritative, access-controlled step, so it goes first; if it's denied we never touch storage. Image removal is best-effort afterward — once the row is gone, a storage hiccup only leaves an orphan blob and shouldn't surface as a user-facing failure (logged via `console.warn`).

### Realtime for the list (extends Epic 12)
Epic 12 wired realtime on the receipt *detail*. This story adds a trip-level subscription so the *list* reacts to remote inserts/deletes. `replica identity full` (migration 0008) makes the DELETE event carry the old row, so the `trip_id=eq.…` filter matches deletes too. `refreshReceipts` is a light receipts-only re-fetch to avoid the full-page loading flash `loadTrip` would cause.

### Confirmation UX
An inline two-step confirm (trash icon → Confirm/Cancel) rather than `window.confirm`, so it's styleable, keyboard/screen-reader friendly, and consistent with the app's component-based UI.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- No DB migration required (existing `for all` RLS covers delete).
- Realtime list refresh also improves Story 13.2 AC5 (new receipts appear live for other clients).

### File List

**Added:**
- `utils/db/deleteReceipt.ts`

**Modified:**
- `components/feature/ReceiptList.tsx`
- `app/trips/[id]/page.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Add receipt delete (RLS-enforced row delete + storage cleanup) with inline confirm; trip-level realtime subscription refreshes the list/ledger and propagates deletes to other clients. | Amelia (Dev) |
