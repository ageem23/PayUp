---
baseline_commit: 571cdeff3b04f8e8ffafb36d699b85b0dd2ccef7
---

# Story 12.2: Implement Real-Time Collaboration UI

Status: done

## Story

As a collaborating user,
I want my changes to save automatically and to see others' changes in real time,
so that we can split a receipt together seamlessly.

## Acceptance Criteria

1. ~~Anonymous auto sign-in on invite links~~ — **intentionally not implemented** (preserves the whitelist; see Decision in 12.1).
2. The splitting view opens a Supabase Realtime subscription on the receipt object. ✔
3. Every change dispatches an optimistic DB write and is broadcast to others. ✔ (the existing autosave write IS the broadcast — Supabase streams the row change.)
4. Manual "Save" buttons removed from the view. ✔ **(already true — the app autosaves; there were no Save buttons. `SyncStatusBar` shows status only.)**
5. Inbound remote changes update the UI instantly with no form-reset bugs or feedback loops. ✔

## Tasks / Subtasks

- [x] **Subscribe** — `ReceiptSplitView` opens a `postgres_changes` channel (`receipt:<id>`, UPDATE, `id=eq.<id>`) on mount and removes it on unmount.
- [x] **Apply remote splits** — inbound `split_among` replaces local splits **only when it differs** (`JSON.stringify` compare), so the echo of our own write is ignored — no loop, no grid reset (AC5).
- [x] **Apply remote fees** — inbound `tax`/`tip` update state **without** re-saving, and sync `savedFeesRef`/`currentFeesRef` so the debounced saver treats them as already-committed (last-write-wins; the DB row is source of truth).
- [x] **No separate broadcast needed** — the per-change DB writes (Epic 7/8 autosave) already trigger Supabase's row broadcast to other members; we only consume here.

## Dev Notes

### No anonymous sessions (Decision)
12.2 AC1's `signInAnonymously()` is dropped — it would bypass the `allowed_users` whitelist (Epic 2/11). Realtime is for authenticated, whitelisted members, who reach a trip via the Epic 11 invite→login→member flow. See 12.1 Dev Notes.

### Loop / reset prevention (AC5)
Supabase broadcasts every row change, including our own. The splits handler ignores an inbound array equal to current state, and the fee handler never routes inbound values back through `scheduleFeeSave`. So our own echoes are no-ops and only genuinely-remote edits mutate the UI. Best-effort last-write-wins (no per-cell merge); acceptable for this collaborative scope.

### Requires the backend (12.1)
Live updates need `0008_realtime_receipts.sql` applied (replica identity full + `receipts` in the realtime publication). Without it the subscription is a harmless no-op (no events).

### AC4 already satisfied
The matrix and fee inputs autosave (Epics 6–8); the UI only ever had a `SyncStatusBar` status indicator, never a manual Save button — nothing to remove.

### No tests
Realtime/UI subscription wiring — no pure unit-testable logic added. "Tested" = lint + build + existing suite (44) green.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔; `npm test` → 44 passed (9 suites).

### Completion Notes List

- Local self-review pass; BMAD adversarial review runs on the full epic diff before the PR, then CodeRabbit on the PR.
- Requires `0008` applied + "Anonymous sign-ins" left OFF (per Decision).

### File List

**Modified:**
- `components/feature/ReceiptSplitView.tsx` (realtime `postgres_changes` subscription; apply remote split/fee edits, loop-guarded)

## Review Findings

_From `bmad-code-review` (adversarial; concurrency-focused) on `main...epic-12`, 2026-06-21._

- [x] [Review][Patch] Inbound fee handler discarded a mid-typing local edit [components/feature/ReceiptSplitView.tsx] — **FIXED (HIGH):** an inbound `tax`/`tip` arriving during the 600 ms fee debounce overwrote `currentFeesRef`/`savedFeesRef`, so the saver then saw `saved===current` and silently dropped the user's value. Inbound fees are now applied only when no local fee save is pending (`feeTimerRef.current === null`).
- [x] [Review][Patch] Local toggle could clobber a concurrent remote split edit [components/feature/ReceiptSplitView.tsx] — **FIXED (HIGH):** `handleToggle` computed from the render-closure `splits`, so after an inbound remote update a toggle wrote a stale full array and wiped the remote change. Toggles now base off `splitsRef` (kept in sync with state + inbound), via a `setSplitsSynced` helper.
- [x] [Review][Patch] Order-sensitive self-echo compare [components/feature/ReceiptSplitView.tsx] — **FIXED (MEDIUM):** `JSON.stringify` equality failed because jsonb reorders keys/elements, so our own echo didn't match and re-applied. Added `sameSplits` (sorts items + participants) for an order-insensitive compare.

**Dismissed:** StrictMode double-subscribe / async `removeChannel` race (canonical Supabase channel-per-effect + cleanup pattern; dev-only / rare on fast nav); `replica identity full` not applied → silent no-op (manual deploy step, documented; code degrades safely without crashing or resetting the grid); no `subscribe` status UI (no surface to display it; documented limitation).

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Realtime subscription on the receipt row applying remote split/fee edits (loop-guarded, no re-save); anonymous sign-in dropped (whitelist preserved); AC4 already satisfied (autosave, no Save buttons). Merged into `epic-12`. | Amelia (Dev) |
