# Epic 13: Streamline the Receipt Experience

## Overview
The goal of Epic 13 is to reduce friction in PayUp's most-traveled path — getting a receipt *in* and keeping it *accurate*. Today a user can only add receipts via drag-drop/file-picker, cannot see a trip's receipts in one place, cannot edit OCR'd line items, cannot delete a receipt, and must manually type the name, tax, and tip. This epic closes those gaps so the capture-to-split loop is fast and forgiving of bad OCR.

This phase adds mobile camera capture, a trip-level receipt list, full receipt editing (lines + name) and deletion, OCR-driven auto-population of name/tax/tip with a smart tip default, and a mobile layout that leads with the assignment matrix.

## Target Architecture Blueprint
* **Capture:** `capture="environment"` on the existing file input in `ReceiptUploadZone` — reuses the entire upload → staging → OCR pipeline; desktop falls back to the file picker.
* **Receipt List:** New list/grid component on `/trips/[id]` rendering the already-fetched receipts (thumbnail from `image_url`, `name`, computed total, `created_at`, payer).
* **Delete:** Server-enforced delete (owner + approved member via `is_trip_member`) plus `receipt-images` bucket cleanup; explicit confirmation; removal broadcast through the Epic 12 realtime channel.
* **Edit:** Mutate the `receipts.processed_data` JSONB (add / edit / delete `LineItem`); deleting a line prunes its `item_id` from `split_among`; `receipts.name` becomes editable.
* **OCR Extension:** Extend the Gemini structured-output schema (`app/api/ocr/route.ts`) to also return merchant name, tax, tip, and grand total alongside line items; persisted **prefill-only**.
* **Tip Default:** When OCR yields no tip and the tip field is blank/zero, prefill 20% of the pre-tax subtotal (sum of `processed_data` prices), rounded to the cent.
* **Mobile Order:** Reorder the `ReceiptSplitView` grid so `ReceiptMatrix` precedes the `ReceiptSummarySidebar` (fees/total) on single-column; the `lg:` two-column layout is unchanged.

## Epic Backlog Registry
* **Story 13.1:** Mobile Camera Capture
* **Story 13.2:** Trip Receipt List
* **Story 13.3:** Delete Receipt
* **Story 13.4:** OCR Auto-Population of Name, Tax & Tip
* **Story 13.5:** Smart Default Tip (20% of Subtotal)
* **Story 13.6:** Edit Receipt (Lines & Name)
* **Story 13.7:** Mobile Layout — Assignment Matrix Above Fees & Total

---

## Story 13.1: Mobile Camera Capture
**As a** user splitting a bill at the table,
**I want** to photograph a receipt directly with my phone camera,
**so that** I don't have to take a photo separately and then upload it.

### Acceptance Criteria
1. The receipt add control offers a camera option; on mobile devices it opens the native rear/environment camera via `capture="environment"`.
2. On desktop or unsupported devices, behavior gracefully falls back to the existing file picker — no regression to the current upload flow.
3. Captured images flow through the existing upload → staging → OCR pipeline unchanged (same JPG/PNG validation, same `receipt-images` bucket).
4. Format/size validation and error handling match the current upload path.

## Story 13.2: Trip Receipt List
**As a** trip participant,
**I want** to see all of a trip's receipts in one place,
**so that** I can find and open the one I need.

### Acceptance Criteria
1. The trip page (`/trips/[id]`) renders a list/grid of that trip's receipts.
2. Each item shows the receipt name, an image thumbnail (when `image_url` is present), the computed total, the created date, and the payer (when set).
3. Selecting an item opens its split view (`/trips/[id]/receipts/[receiptId]`).
4. An empty state is shown when the trip has no receipts.
5. The list reflects newly added receipts and updates after a delete (Story 13.3).
6. Visibility respects RLS — the trip owner and approved members see the trip's receipts.

## Story 13.3: Delete Receipt
**As a** trip owner or member,
**I want** to delete a receipt from a trip,
**so that** mistakes and duplicates don't pollute the settle-up.

### Acceptance Criteria
1. A delete action is available per receipt (from the list and/or the detail view).
2. Deleting requires explicit user confirmation.
3. On confirm, the receipt row is removed and its stored image is cleaned up from the `receipt-images` bucket.
4. Authorization is enforced server-side (not UI-only): the trip owner and approved members (`is_trip_member`) may delete; non-members cannot.
5. The receipt list and the settle-up ledger recompute without the deleted receipt.
6. Other connected clients see the receipt disappear via the Epic 12 realtime channel.

## Story 13.4: OCR Auto-Population of Name, Tax & Tip
**As a** user adding a receipt,
**I want** the name, tax, and tip filled in from the photo,
**so that** I barely have to type anything.

### Acceptance Criteria
1. The OCR pipeline extracts the merchant/restaurant name, tax amount, tip amount, and grand total in addition to line items.
2. After processing, a new receipt's `name` is prefilled from the merchant name **only if** the name is currently empty.
3. Tax and tip are prefilled from OCR **only if** the respective field is currently zero/blank — a value the user already entered is never overwritten (prefill-only).
4. Existing line-item extraction behavior is intact.
5. If OCR cannot determine a field, that field is left for manual entry — no garbage or guessed values are written.

## Story 13.5: Smart Default Tip (20% of Subtotal)
**As a** user whose receipt has no printed tip line,
**I want** a sensible tip filled in automatically,
**so that** I don't have to compute it by hand.

### Acceptance Criteria
1. When OCR finds no tip and the tip field is blank/zero, tip is prefilled to 20% of the pre-tax subtotal (sum of line-item prices), rounded to the cent.
2. The default is applied once as a prefill; the user can freely override it.
3. If OCR did detect a tip (Story 13.4), the detected value takes precedence over the 20% default.
4. The proportional fee math (Epic 7) and settle-up ledger (Epic 8) use the resulting tip correctly.

## Story 13.6: Edit Receipt (Lines & Name)
**As a** user whose OCR result was imperfect,
**I want** to edit a receipt's name and line items,
**so that** the split is based on what the receipt actually says.

### Acceptance Criteria
1. From a receipt's view, the user can edit the receipt name.
2. The user can edit an existing line item's name and price.
3. The user can add a new line item.
4. The user can delete a line item; deleting it prunes that item from the `split_among` assignments so no orphaned assignments remain.
5. Edits persist to `processed_data` (and `name`) and are reflected in the matrix, per-participant shares, and totals immediately.
6. Edits broadcast via the Epic 12 realtime channel to other clients and respect owner/member RLS.

## Story 13.7: Mobile Layout — Assignment Matrix Above Fees & Total
**As a** mobile user,
**I want** the who-shares checkboxes shown before the tip and total,
**so that** I assign items first and read the totals after, without scrolling back up.

### Acceptance Criteria
1. On mobile (single-column) the assignment matrix (`ReceiptMatrix`) renders **above** the fees (tax/tip) and total summary.
2. The desktop two-column layout (`lg:`) is unchanged.
3. Purely a visual reordering — no functional change; verified at both mobile and desktop breakpoints.

---

## Out of Scope (candidate follow-ons, Epic 13.8+)
* On-demand "re-scan" / re-run-OCR button on an existing receipt.
* Bulk delete of multiple receipts.
* A dedicated receipts route separate from the trip page.
* Full in-app live camera (getUserMedia preview/retake) for desktop webcams — deferred in favor of the `capture` attribute.

## Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Initial Epic 13 definition: camera capture, receipt list, delete, OCR auto-population of name/tax/tip, smart 20% tip default, full line/name editing, mobile matrix reorder. | John (PM) |
