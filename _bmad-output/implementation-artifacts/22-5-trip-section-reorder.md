# Story 22.5: Reorder the trip-details sections

Status: done

## Story

As a person opening a trip,
I want receipts at the top and sharing at the bottom,
so that the page follows the order I actually work in.

## Acceptance Criteria

1. On the trip-details page, the sections render in this order: Receipts list → Add a receipt → Participants → Settle up → Share.
2. Every section keeps its current behavior and components (`ReceiptList`, `ReceiptUploadZone`/`ReceiptQuotaGate`, participants add/list, `SettleUpLedger`, `InviteLinkManager`); the Share section stays owner-only.
3. Section spacing (`mb-*` / `mt-*`) is adjusted so the new order has clean, consistent vertical rhythm (no doubled or missing gaps).
4. The trip title/status header and navigation are unchanged; no change to data loading, realtime, or settle-up math.
5. `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Reorder the JSX sections in `app/trips/[id]/page.tsx` to Receipts → Add a receipt → Participants → Settle up → Share (AC: 1).
- [x] Keep the Share block owner-only (`isOwner` guard) (AC: 2).
- [x] Normalize spacing: each reordered `<section>` uses `mt-6`; `SettleUpLedger` self-spaces (`mt-8`) so it needs no wrapper; the Share `InviteLinkManager` keeps its `mt-6` wrapper (AC: 3).
- [x] No changes to data loading, realtime, or settle-up math (AC: 4).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- Pure presentational reorder of existing JSX blocks; no logic touched. [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-225]
- `SettleUpLedger` already carries `mt-8` internally, so placing it before the Share block needed no extra wrapper margin; the Participants section changed from `mb-6` (was first) to `mt-6` (now third).

### Project Structure Notes

- Modified: `app/trips/[id]/page.tsx`.

### References

- [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-225-reorder-the-trip-details-sections]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- `app/trips/[id]/page.tsx`: reordered sections to Receipts → Add a receipt → Participants → Settle up → Share. Participants `<section>` margin `mb-6` → `mt-6`; Add-a-receipt gained `mt-6`; Receipts kept `mt-6`. `SettleUpLedger` (self `mt-8`) moved above the owner-only Share (`InviteLinkManager` in its `mt-6` wrapper). No behavior/logic changes.

### File List

**Modified:**
- `app/trips/[id]/page.tsx`
