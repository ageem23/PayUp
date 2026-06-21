---
baseline_commit: cec896c6b354d93f5d0dc28effbca62d71d1ee88
---

# Story 13.5: Smart Default Tip (20% of Subtotal)

Status: done

## Story

As a user whose receipt has no printed tip line,
I want a sensible tip filled in automatically,
so that I don't have to compute it by hand.

## Acceptance Criteria

1. When OCR finds no tip and the tip field is blank/zero, tip is prefilled to 20% of the pre-tax subtotal (sum of line-item prices), rounded to the cent.
2. The default is applied once as a prefill; the user can freely override it.
3. If OCR did detect a tip (Story 13.4), the detected value takes precedence over the 20% default.
4. The proportional fee math (Epic 7) and settle-up ledger (Epic 8) use the resulting tip correctly.

## Tasks / Subtasks

- [x] `defaultTipFromItems(items)` helper in `utils/math/defaultTip.ts`: 20% (`DEFAULT_TIP_RATE`) of the pre-tax subtotal, rounded to the cent, returns 0 for an empty subtotal. (AC1)
- [x] `MatrixStateWrapper` prefill: when the tip field is 0, OCR-detected tip wins; otherwise fall back to `defaultTipFromItems(extracted)` (skipped when it's 0). (AC1–AC3)
- [x] The default is written to `receipts.tip` and surfaced via `onPrefill`, so it appears as the editable tip in the split view — a one-time prefill the user can change. (AC2)
- [x] Tip flows through the existing `receipts.tip` column, so the Epic 7 proportional split and Epic 8 ledger consume it unchanged. (AC4)
- [x] `npm run lint` + `npm run build` clean.

## Dev Notes

### Builds directly on 13.4's null signal
Story 13.4 returns `tip: null` when OCR couldn't find a tip (vs. `0`). This story uses exactly that branch: inside the `(initialTip ?? 0) === 0` guard, a real OCR number wins; only when it's absent do we compute the 20% default. So the precedence is: user-entered tip > OCR-detected tip > 20%-of-subtotal default.

### Why pre-tax subtotal
US tipping etiquette tips on the subtotal, not the tax-inclusive total (the product decision for this epic). The helper sums line-item prices only — tax is excluded by construction.

### Cent precision
`Math.round(subtotal * 0.2 * 100) / 100` keeps the default on a whole-cent boundary, consistent with the Epic 7 penny-accurate engine that then redistributes it.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Pure helper is independently unit-testable (no test framework in this project, per house rules — verified via lint/build + the integrating flow).
- Default only applies on first scan (when OCR runs); a re-opened receipt with tip already set is untouched (prefill-only).

### File List

**Added:**
- `utils/math/defaultTip.ts`

**Modified:**
- `components/feature/MatrixStateWrapper.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Default tip to 20% of pre-tax subtotal when OCR finds none and the tip is unset; OCR-detected tip and user input take precedence. | Amelia (Dev) |
