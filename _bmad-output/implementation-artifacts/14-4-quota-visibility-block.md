# Story 14.4: Quota Visibility & Limit-Reached Block

Status: done

## Story

As a free-tier user adding receipts,
I want to see how many receipts I have left and a clear message when I run out,
so that the limit never feels like a broken app.

## Acceptance Criteria

1. On the receipt add path, free-tier users see their remaining allowance for the current rolling window (e.g. "2 of 3 receipts left this week") and when it resets.
2. When the limit is reached, attempting to add a receipt is hard-blocked with a clear, friendly message stating the cap and the reset timing — mapped from the 14.2 server error, not a guess.
3. The limit-reached state includes a "get unlimited access" call-to-action that leads into the 14.5 request flow.
4. Unlimited users see no counter and no cap messaging.
5. The displayed count is consistent with the server's authoritative count (the UI may pre-check to avoid a wasted upload, but the server remains the source of truth; a UI/server disagreement fails safe by deferring to the server).
6. Where feasible, the UI prevents a doomed image upload (pre-check) so a blocked attempt does not orphan an image in the `receipt-images` bucket.

## Tasks / Subtasks

- [ ] **Read quota status** (AC: 1, 4, 5) — call `public.receipt_quota_status()` (created in 14.2) via `supabase.rpc('receipt_quota_status')`. Returns `is_unlimited`, `used`, `limit`, `remaining`, `next_available_at`.
  - [ ] Unlimited users (`is_unlimited = true`): render no counter, no cap UI (AC4).
  - [ ] Free-tier: show "`remaining` of `limit` receipts left this week" and, when `remaining = 0`, the reset time from `next_available_at` (AC1).
- [ ] **Pre-check before upload** (AC: 6) — in `components/feature/ReceiptUploadZone.tsx` / the add flow, if `remaining = 0`, block *before* uploading the image to the `receipt-images` bucket, avoiding an orphaned object.
- [ ] **Limit-reached block** (AC: 2) — friendly message stating the 2/week cap + reset timing. Also catch the server error as the authority: map `error.message === 'RECEIPT_QUOTA_EXCEEDED'` from the `receipts` insert to this same UI (covers the race where the pre-check passed but the server blocks). [Source: docs/docs/prd/epic-14/epic_14_architecture.md#5-d3-weekly-quota-enforcement-the-core-meter]
- [ ] **Upgrade CTA** (AC: 3) — the block includes a "get unlimited access" action that opens the 14.5 request flow.
- [ ] **Fail-safe (AC: 5):** on any UI/server disagreement, defer to the server (the trigger is the source of truth). The counter is advisory.
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **No migration** — pure UI consuming the 14.2 `receipt_quota_status()` helper and the `RECEIPT_QUOTA_EXCEEDED` error contract. Depends on 14.2 being deployed. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#8-d6-quota-read-for-the-ui]
- **Two enforcement touchpoints, one authority:** the pre-check (AC6) is an optimization to avoid orphaned uploads; the server trigger (14.2) is the real gate. Always handle the server error even if the pre-check said "ok." [Source: docs/docs/prd/epic-14/epic_14_architecture.md#5-d3-weekly-quota-enforcement-the-core-meter]
- **Reset semantics:** `next_available_at` = oldest in-window receipt's `created_at + 7 days` (rolling window), computed server-side — display it, don't recompute client-side. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#8-d6-quota-read-for-the-ui]
- **Don't trust client tier for security** — `is_unlimited` from the RPC drives *display only*; the server enforces the actual cap.
- **Scope reminder:** the only free-tier limit is this receipt cap — trip creation is unrestricted, so there is no trip-related block UI in this story.

### Project Structure Notes

- Touch the receipt add UI: `components/feature/ReceiptUploadZone.tsx`, `components/feature/ReceiptStagingModal.tsx`, and the trip page `app/trips/[id]/page.tsx` where the add control lives. ⚠️ Epic 13 is actively editing this receipt flow — coordinate/rebase.

### References

- [Source: docs/docs/prd/epic-14/epic_14_overview.md#story-144-quota-visibility--limit-reached-block]
- [Source: docs/docs/prd/epic-14/epic_14_architecture.md#8-d6-quota-read-for-the-ui]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- `fetchReceiptQuota()` reads `receipt_quota_status()` (14.2) and maps to a typed `ReceiptQuota`; fails safe to `null` on error (no counter, server still enforces). +4 unit tests.
- `ReceiptQuotaGate` wraps the add UI: unlimited/unknown → just the uploader (AC4); free-tier with allowance → "`remaining` of `limit` receipts left this week" + uploader (AC1); at the cap → limit-reached block **instead of** the uploader (pre-check → no orphaned upload, AC6) with the "Get unlimited access" CTA (AC3).
- Trip page fetches quota on load and refreshes it on every realtime receipt change and on staging-modal close, so the counter tracks the server.
- **Server is the authority (AC2, AC5):** `ReceiptStagingModal` maps an insert error containing `RECEIPT_QUOTA_EXCEEDED` (from the 14.2 trigger) to a friendly limit message — covers the race where the pre-check passed but the server blocked.
- CTA opens the `AccessRequestModal` (built in 14.5).
- `npm run lint` + `npm run build` + `npm test` clean (57 tests).

### File List

**Added:**
- `utils/db/receiptQuota.ts`
- `components/feature/ReceiptQuotaGate.tsx`
- `tests/integration/db/receiptQuota.test.ts`

**Modified:**
- `app/trips/[id]/page.tsx`
- `components/feature/ReceiptStagingModal.tsx`
