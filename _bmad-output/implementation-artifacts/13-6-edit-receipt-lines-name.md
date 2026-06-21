---
baseline_commit: 044a9a22b0365e06a5b8ddd0abbc646541eeb4ee
---

# Story 13.6: Edit Receipt (Lines & Name)

Status: done

## Story

As a user whose OCR result was imperfect,
I want to edit a receipt's name and line items,
so that the split is based on what the receipt actually says.

## Acceptance Criteria

1. From a receipt's view, the user can edit the receipt name.
2. The user can edit an existing line item's name and price.
3. The user can add a new line item.
4. The user can delete a line item; deleting it prunes that item from the `split_among` assignments so no orphaned assignments remain.
5. Edits persist to `processed_data` (and `name`) and are reflected in the matrix, per-participant shares, and totals immediately.
6. Edits broadcast via the Epic 12 realtime channel to other clients and respect owner/member RLS.

## Tasks / Subtasks

- [x] `patchReceiptItems` + `patchReceiptName` utils (`utils/db/receiptEdits.ts`) with the shared no-op-write guard. (AC5)
- [x] Inline name editing on the receipt detail page (✏️ → input + Save/Cancel), optimistic local update. (AC1)
- [x] `ReceiptItemsEditor` component: per-line name + price inputs, delete button, "Add item" button, with a sync indicator. (AC2, AC3)
- [x] `ReceiptSplitView` now owns editable `lineItems` (seeded from the OCR'd items prop) + `lineItemsRef`; the matrix and proportional totals read from it. (AC5)
- [x] Edit handlers: `updateItem` (debounced save), `handleAddItem` (immediate save), `handleDeleteItem` (removes the line AND prunes its `split_among` node, persisting both). (AC2–AC4)
- [x] Realtime: subscription extended to apply remote `processed_data` edits (order-insensitive self-echo guard `sameItems`); item writes broadcast like split/fee writes. (AC6)
- [x] Unmount flush for a pending debounced item edit. (AC5)
- [x] `npm run lint` + `npm run build` clean.

## Dev Notes

### Ownership shift: items become editable in ReceiptSplitView
Previously `items` were read-only props flowing from `MatrixStateWrapper`. This story seeds them into `ReceiptSplitView` state (`lineItems`), which becomes the live owner for editing. The wrapper still handles OCR → `processed_data` and renders the split view only after scanning, so the seed is always the final post-OCR array.

### Delete prunes split_among (AC4)
Deleting a line removes it from `processed_data` and filters its `item_id` out of `split_among`, persisting both via their own serialized chains (mirrors the existing splits-save pattern). No orphan allocation survives, so the proportional engine never references a missing item.

### Save cadence
Text edits (name/price) debounce 600ms (coalesce typing); structural changes (add/delete) persist immediately. All saves are serialized + sequenced so a slow earlier write can't clobber a newer one, matching the fee/split autosave design. Item edits broadcast via the same Supabase row-change mechanism Epic 12 uses, and the subscription now consumes remote `processed_data` changes.

### Name realtime (scope note)
A name edit writes to `receipts`, which the trip-list channel (Story 13.3) consumes — so other clients' receipt *lists* refresh names. Live-updating the name in another client's open *detail heading* is not wired (the detail page heading is page-local); flagged as a minor follow-on if needed.

### RLS
All writes go through the user's Supabase session; the receipts `for all` owner+member policies (0004/0007) authorize edits exactly as for splits/fees.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- No DB migration; edits the existing `processed_data` and `name` columns.
- Adding a line inserts a blank `{name:"", price:0}` row the user fills in the editor.

### File List

**Added:**
- `utils/db/receiptEdits.ts`
- `components/feature/ReceiptItemsEditor.tsx`

**Modified:**
- `components/feature/ReceiptSplitView.tsx`
- `app/trips/[id]/receipts/[receiptId]/page.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Editable receipt name + full line-item CRUD (add/edit/delete with split_among pruning); persistence + realtime sync of processed_data. | Amelia (Dev) |
