# Story 14.1: Receipt Authorship Attribution (`created_by`)

Status: done

## Story

As a system enforcing per-user limits,
I want every receipt to record which user created it,
so that receipts can be counted per user — the prerequisite for any quota.

## Acceptance Criteria

1. The `receipts` table gains a `created_by uuid` column referencing `auth.users.id` (nullable to tolerate legacy/backfill rows).
2. Every new receipt insert (from the existing staging flow and any other path) populates `created_by` with the authenticated user who created it.
3. Existing receipt rows are backfilled best-effort: `created_by` is set to the parent trip's owner (`trips.user_id`) where determinable, otherwise left `null`.
4. No user-visible behavior changes — receipt creation, OCR, splitting, and totals are unaffected.
5. RLS continues to allow trip owners and approved members to create receipts; the new column does not tighten or loosen who may write.

## Tasks / Subtasks

- [ ] **Migration `0009_receipt_created_by.sql`** (AC: 1, 2, 3)
  - [ ] `alter table public.receipts add column created_by uuid references auth.users(id);`
  - [ ] Set column default so inserts self-populate *before* the 14.2 trigger exists: `alter column created_by set default auth.uid();` (the 14.2 trigger later force-stamps this authoritatively for anti-spoof — the default is the standalone mechanism that satisfies AC2 for this story).
  - [ ] Best-effort backfill: `update public.receipts r set created_by = t.user_id from public.trips t where r.trip_id = t.id and r.created_by is null;`
  - [ ] ⚠️ Coordinate the migration number with the parallel Epic 13 session before claiming `0009` (see architecture §10).
- [ ] **No client change required** (AC: 2, 4) — the staging insert in `components/feature/ReceiptStagingModal.tsx` omits `created_by`, so the column default applies. Confirm no insert path explicitly sets it.
- [ ] **Verify RLS unchanged** (AC: 5) — the existing owner/member `FOR ALL` policy on `receipts` still governs writes; the additive column does not alter it.
- [ ] **Manual Supabase apply** of `0009` (project applies migrations manually, per Epic 12 convention).
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **Pure enabling story** — no behavior change, no UI. It exists solely so 14.2 can count receipts per user.
- **Why `default auth.uid()` here and a trigger in 14.2:** the default makes new rows self-attribute immediately (satisfying AC2 standalone). Story 14.2 adds a `BEFORE INSERT` trigger that *force-assigns* `created_by := auth.uid()`, overriding any client-supplied value — that's the anti-spoof guarantee. Keeping the default is intentional belt-and-suspenders. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#4-d2-receipt-attribution-created_by]
- **Nullable on purpose** — backfilled rows with no resolvable owner stay `null`; acceptable because the quota only meters *future* free-tier inserts, which are always stamped.
- **Do NOT enforce `created_by = auth.uid()` via RLS `with check`** — the `receipts` policy is `FOR ALL`, so that check would also fire on UPDATE and break Epic 13.6 collaborative editing. Attribution is enforced by the trigger (14.2), not RLS. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#4-d2-receipt-attribution-created_by]

### Project Structure Notes

- Migration lives in `supabase/migrations/` (current head: `0008_realtime_receipts.sql`).
- `receipts` schema reference: [Source: docs/04_System_Architecture_Master_v3.md#1-definitive-database-schema].

### References

- [Source: docs/docs/prd/epic-14/epic_14_overview.md#story-141-receipt-authorship-attribution-created_by]
- [Source: docs/docs/prd/epic-14/epic_14_architecture.md#4-d2-receipt-attribution-created_by]
- [Source: docs/docs/prd/epic-14/epic_14_architecture.md#10-migration-plan]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Migration-only story; no app or test change (column is additive, behavior unchanged).
- `created_by` added with `default auth.uid()` so new inserts self-attribute even before the 14.2 trigger; backfilled to the trip owner where determinable.
- **Manual Supabase apply** required for `0009` (CI does not run migrations; per Epic 12 convention).
- Confirmed no insert path sets `created_by` explicitly — `ReceiptStagingModal` omits it, so the default applies. RLS unchanged (additive column).

### File List

**Added:**
- `supabase/migrations/0009_receipt_created_by.sql`
