---
baseline_commit: 156bdf07e9a7e3b9b259b7b2de440b76cf64c323
---

# Story 13.1: Mobile Camera Capture

Status: done

## Story

As a user splitting a bill at the table,
I want to photograph a receipt directly with my phone camera,
so that I don't have to take a photo separately and then upload it.

## Acceptance Criteria

1. The receipt add control offers a camera option; on mobile devices it opens the native rear/environment camera via `capture="environment"`.
2. On desktop or unsupported devices, behavior gracefully falls back to the existing file picker — no regression to the current upload flow.
3. Captured images flow through the existing upload → staging → OCR pipeline unchanged (same JPG/PNG validation, same `receipt-images` bucket).
4. Format/size validation and error handling match the current upload path.

## Tasks / Subtasks

- [x] Add a second "Take a photo" control to `ReceiptUploadZone` — a hidden `<input type="file" accept="image/jpeg,image/png" capture="environment">` wrapped in a labeled, tappable button. (AC1)
- [x] Route the camera input through the same `handleChange` → `uploadFile` pipeline as the existing browse/drag input — no new validation or upload path. (AC3, AC4)
- [x] Rely on browser fallback: desktop/unsupported browsers ignore `capture` and open the file picker; the existing drag-drop browse control is untouched. (AC2)
- [x] Reset `event.target.value` after selection so re-shooting / re-selecting the same file still fires `onChange`.
- [x] `npm run lint` + `npm run build` clean.

## Dev Notes

### Why `capture="environment"` on a plain file input (not getUserMedia)
Per the product decision for this epic, camera capture uses the HTML `capture` attribute rather than a full in-app live-camera component. On mobile this opens the native rear camera directly; on desktop the attribute is ignored and the input behaves as a normal file picker (AC2 satisfied for free). This reuses the *entire* existing upload → staging → OCR pipeline, so there is no second code path to validate.

### No new validation
The camera input shares `handleChange`/`uploadFile` with the browse input, so the existing `.jpg/.jpeg/.png` extension check, the `receipt-images` bucket upload, and the error handling all apply unchanged.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Pure client-side UI change; no DB migration, no API change.
- Added the input-value reset (benefits both controls) so consecutive captures of the same file are not swallowed by the browser.

### File List

**Modified:**
- `components/feature/ReceiptUploadZone.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Add mobile camera capture via a `capture="environment"` file input reusing the existing upload pipeline; reset input value for re-shoot. | Amelia (Dev) |
