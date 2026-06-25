# Story 20.2: Simplify the Receipt Upload Dialog

Status: done

## Story

As a person adding a receipt,
I want the dialog to ask who paid instead of a name I don't need to type,
so that I'm not entering a name the scan will fill in anyway.

## Acceptance Criteria

1. The receipt-name text box is removed from the staging dialog.
2. The dialog asks **who paid** the bill — a selector over the trip's participants.
3. On create, the receipt's `paid_by` is set from the selection; the receipt `name` is left for OCR to populate (Epic 13.4).
4. The rest of the add-receipt flow (image upload, quota gate, insert, navigate to the new receipt) is unchanged.
5. A receipt can still be renamed afterward on the receipt page (existing behavior, untouched).

## Tasks / Subtasks

- [ ] **Drop the name field** (AC: 1) — in `ReceiptStagingModal` (the dialog opened from the trip page once an image is staged), remove the receipt-name `<input>` and its state/validation.
- [ ] **Add a "Paid by" selector** (AC: 2) — render a `<select>` (or chip list) over the `participants` the modal already receives; label it clearly ("Who paid?"). Default to a sensible value (e.g. the first participant) and require a selection before create if the trip has participants.
- [ ] **Set `paid_by` on insert** (AC: 3) — pass the selected participant as `paid_by` in the receipt insert; do **not** send a user-typed `name` (leave it empty/placeholder so the OCR pass fills it, per Epic 13.4).
- [ ] **Preserve the flow** (AC: 4, 5) — keep the quota gate, the insert, and the `onCreated` navigation to `/trips/{tripId}/receipts/{id}`; renaming on the receipt page is unchanged.
- [ ] **Edge cases** — handle a trip with **no participants** gracefully (e.g. allow create with `paid_by` empty, or prompt to add participants first); confirm the receipt list / settle-up don't break when `paid_by` is set at creation.
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- The dialog is **`ReceiptStagingModal`**, opened from `app/trips/[id]/page.tsx` when `stagingUrl` is set after `ReceiptUploadZone` returns the image URL. It already receives `tripId`, `participants`, `imageUrl`, `onClose`, `onCreated`. [Source: app/trips/[id]/page.tsx ~L410-426]
- `ReceiptUploadZone` only handles the image (drag/drop + camera) and calls `onUploaded(publicUrl)` — no name field there. The name box lives in the staging modal. [Source: components/feature/ReceiptUploadZone.tsx]
- **OCR fills the name** (Epic 13.4: `app/api/ocr/route.ts` returns `merchant`/name + items + tax + tip), so a manual name at create time is redundant.
- **`paid_by`** is a `varchar` on `receipts` holding a participant label; today it's set/edited on the receipt detail page. This story moves the *initial* capture to creation. No schema change. [Source: supabase/migrations/0004_receipts.sql]

### Project Structure Notes

- Modify `ReceiptStagingModal` (under `components/feature/`); no change to `ReceiptUploadZone` or the DB. Confirm the exact modal filename before editing.

### References

- [Source: docs/docs/prd/epic-20/epic_20_overview.md#story-202-simplify-the-receipt-upload-dialog]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- `ReceiptStagingModal` already had a "Paid by" selector and an *optional* name field; this story **removed the name input** entirely (and its state), replacing it with a one-line hint that the name is filled from the scan.
- Insert now sends `name: ""` so the OCR pass populates it (Story 13.4); `paid_by` comes from the selector (still required when the trip has participants). The quota-error handling and `onCreated` navigation are unchanged.
- Renaming on the receipt page afterward is untouched (AC5). `npm run lint` (exit 0) + `npm run build` + `npm test` (90) clean.

### File List

**Modified:**
- `components/feature/ReceiptStagingModal.tsx`
