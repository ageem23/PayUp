---
baseline_commit: ec775e6ffba7acae36f0add765234cb492912d24
---

# Story 13.2: Trip Receipt List

Status: done

## Story

As a trip participant,
I want to see all of a trip's receipts in one place,
so that I can find and open the one I need.

## Acceptance Criteria

1. The trip page (`/trips/[id]`) renders a list/grid of that trip's receipts.
2. Each item shows the receipt name, an image thumbnail (when `image_url` is present), the computed total, the created date, and the payer (when set).
3. Selecting an item opens its split view (`/trips/[id]/receipts/[receiptId]`).
4. An empty state is shown when the trip has no receipts.
5. The list reflects newly added receipts and updates after a delete (Story 13.3).
6. Visibility respects RLS — the trip owner and approved members see the trip's receipts.

## Tasks / Subtasks

- [x] New `ReceiptList` component rendering an ordered list of receipts with thumbnail, name, computed grand total, payer, and created date; each row is a `Link` to the receipt split view. (AC1–AC3)
- [x] Empty state when the trip has no receipts. (AC4)
- [x] Broaden the trip page's receipts fetch to a superset (`id,name,image_url,created_at,...`) and order newest-first; keep feeding the same rows to `compileLedger` (it reads only the `LedgerReceipt` subset). (AC1, AC5)
- [x] Receipt rows load under the user's Supabase session, so owner+member RLS (Epic 11) governs visibility — no extra auth code. (AC6)
- [x] `npm run lint` + `npm run build` clean.

## Dev Notes

### One fetch, two consumers
The trip page already fetched receipts for the Settle Up ledger. Rather than a second round-trip, the select was widened to a superset and the result typed `TripReceipt = LedgerReceipt & ReceiptListItem`. `compileLedger` only reads the `LedgerReceipt` fields, so the extra display columns are inert to it.

### Total computation
Grand total per row = line-item subtotal (`sum(processed_data[].price)`) + `tax` + `tip`, matching the split engine's grand total. Uses the house `money` helper (`$${value.toFixed(2)}`).

### Raw `<img>` for the thumbnail
The thumbnail uses a plain `<img>` (with a scoped `@next/next/no-img-element` disable) rather than `next/image`, to avoid configuring remote image domains for Supabase Storage for a 48px thumbnail. Falls back to a 🧾 placeholder when `image_url` is null.

### AC5 — list freshness
New receipts: after staging, the user routes to the receipt detail; returning to the trip remounts and reloads the list. Post-delete refresh is wired in Story 13.3 (which reloads the trip after a successful delete). Live realtime sync of the list itself is out of scope here (Epic 12 covers the receipt detail).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- No DB migration; read-only feature reusing existing RLS.
- `created_at` ordering added to the query (newest first).

### File List

**Added:**
- `components/feature/ReceiptList.tsx`

**Modified:**
- `app/trips/[id]/page.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Add a per-trip receipt list (thumbnail, name, total, payer, date) with empty state; widen the trip receipts fetch and order newest-first. | Amelia (Dev) |
