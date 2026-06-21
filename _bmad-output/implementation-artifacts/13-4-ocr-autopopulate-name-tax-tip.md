---
baseline_commit: df05c114b2e8f73de32d8ecc4c11c66623c616c1
---

# Story 13.4: OCR Auto-Population of Name, Tax & Tip

Status: done

## Story

As a user adding a receipt,
I want the name, tax, and tip filled in from the photo,
so that I barely have to type anything.

## Acceptance Criteria

1. The OCR pipeline extracts the merchant/restaurant name, tax amount, tip amount, and grand total in addition to line items.
2. After processing, a new receipt's `name` is prefilled from the merchant name **only if** the name is currently empty.
3. Tax and tip are prefilled from OCR **only if** the respective field is currently zero/blank — a value the user already entered is never overwritten (prefill-only).
4. Existing line-item extraction behavior is intact.
5. If OCR cannot determine a field, that field is left for manual entry — no garbage or guessed values are written.

## Tasks / Subtasks

- [x] OCR route: switch Structured Output from a top-level ARRAY to an OBJECT returning `merchant`, `items`, `tax`, `tip`, `total`; `tax/tip/total` are `nullable` so "not found" (null) is distinguishable from 0. Updated the prompt accordingly. (AC1, AC5)
- [x] `normalizeNullableAmount` helper preserves the null signal (vs. `normalizePrice` which floors to 0); merchant trimmed and clamped to 255 chars (column width). (AC1, AC5)
- [x] `MatrixStateWrapper` consumes the richer payload and builds a **prefill-only** update: name only when blank, tax/tip only when 0 and OCR returned a non-negative number. (AC2, AC3)
- [x] Resolved fields surfaced up via `onPrefill` → receipt page updates local state, so the heading shows the merchant name and the split view (mounted post-OCR) initializes from prefilled fees. (AC2, AC3)
- [x] Staging modal: receipt name made **optional** so OCR can fill it (placeholder "Auto-filled from the receipt"). (AC2)
- [x] Line items still parsed/persisted exactly as before. (AC4)
- [x] `npm run lint` + `npm run build` clean.

## Dev Notes

### OCR schema: ARRAY → OBJECT
The model now returns `{ merchant, items[], tax, tip, total }`. `items` stays `required`; `merchant/tax/tip/total` are `nullable`. The route returns `tax/tip/total` as `number | null` (via `normalizeNullableAmount`) so a missing tip is `null`, not `0` — which Story 13.5's 20% default relies on.

### Prefill-only semantics (never clobber the user)
Prefill decisions use the receipt's **mount-time** values:
- `name` ← merchant only when the current name is blank.
- `tax`/`tip` ← OCR only when the current value is `0` AND OCR returned a non-negative number (the `receipts` `>= 0` DB constraint).

OCR only runs on first scan (when `processed_data` is empty), so this is inherently the new-receipt path; a re-opened, already-scanned receipt is never auto-touched.

### Surfacing prefilled fees to the split view
`MatrixStateWrapper` renders the split view only after `processing` ends. It calls `onPrefill(resolved)` **before** `setItems`, so the page updates `receipt.tax/tip/name` first; the split view then mounts with the prefilled fees, and the heading shows the merchant name. (Realtime would also echo the DB write, but the subscription isn't mounted yet at prefill time — passing values down is the reliable path.)

### Member access note (pre-existing, out of scope)
The receipt detail page still loads the trip with `.eq("user_id", userId)` (owner-only). That predates this epic and isn't changed here; flagged for a later story if member receipt editing is desired.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- No DB migration; uses existing `name`/`tax`/`tip` columns.
- `total` is extracted and returned but not yet persisted (no column); available for future reconciliation/validation.

### File List

**Modified:**
- `app/api/ocr/route.ts`
- `components/feature/MatrixStateWrapper.tsx`
- `app/trips/[id]/receipts/[receiptId]/page.tsx`
- `components/feature/ReceiptStagingModal.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Extend OCR to extract merchant/tax/tip/total; prefill-only population of name/tax/tip; make staging name optional. | Amelia (Dev) |
