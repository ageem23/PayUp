# Story 21.1: Split Mode + Total Source

Status: ready-for-dev

## Story

As a developer building even-split, I want a receipt-level split mode and a reliable total source, so that a receipt can be divided evenly even when it has no line items.

(Full acceptance criteria: [docs/docs/prd/epic-21/epic_21_overview.md](../../docs/docs/prd/epic-21/epic_21_overview.md#story-211-split-mode--total-source).)

## Tasks / Subtasks

- [ ] **Decide & document the total source** (AC: 1) — even mode divides a receipt **total** that must work with zero items. Use the existing `receipts.amount numeric(10,2)` column as that total: auto-fill from `sum(items) + tax + tip` when items exist, allow manual entry when they don't. Record the decision in the Dev Agent Record.
- [ ] **Migration `0017_even_split_mode.sql`** (AC: 2) — `alter table public.receipts add column split_mode text not null default 'itemized'` (constrain to `itemized`/`even`) and `add column even_split_among jsonb not null default '[]'::jsonb`. Idempotent; **manual Supabase apply**.
- [ ] **No regression to existing receipts** (AC: 3) — existing rows default to `itemized`; nothing reads `even_split_among` unless `split_mode = 'even'`.
- [ ] **RLS** (AC: 4) — confirm the new columns are covered by the current `receipts` policies (no new policy, no widening).
- [ ] **Types** — extend the receipt type(s) used by the trip page / receipt page / `LedgerReceipt` to include `split_mode`, `even_split_among`, and `amount` so downstream stories can consume them. Update the receipt SELECT lists to fetch the new columns.
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **`receipts.amount` already exists** (`numeric(10,2) default 0`, written as `0` by `ReceiptStagingModal` and otherwise unused) — repurpose it as the even-mode total rather than adding a new column. [Source: supabase/migrations/0004_receipts.sql]
- **Migration numbering:** head is `0016_trip_participants_member_write.sql`, so this is **`0017`**. [Source: supabase/migrations/]
- **No realtime migration needed** — `receipts` is already `replica identity full` + in the `supabase_realtime` publication (Epic 12, `0008`), so the new columns broadcast automatically; 21.4 only consumes them.
- This is the **architectural-decision story**: keep it small and unblock 21.2–21.4. Don't build UI or math here — just the model, columns, types, and SELECT lists.

### Project Structure Notes

- Add `supabase/migrations/0017_even_split_mode.sql`; update receipt types + SELECT lists in `app/trips/[id]/page.tsx`, `app/trips/[id]/receipts/[receiptId]/page.tsx`, and `utils/math/ledgerCompiler.ts` (`LedgerReceipt`).

### References

- [Source: docs/docs/prd/epic-21/epic_21_overview.md#story-211-split-mode--total-source]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
