---
baseline_commit: 60ebe84eee741729eccb3e55566956009dbca715
---

# Story 4.2: Receipt Metadata Transaction Staging & Parent Trip Association

Status: done

## Story

As a traveler adding costs to a group ledger,
I want to confirm a receipt name and who paid after uploading an image,
so that I stage the bill container for later line-item processing.

## Acceptance Criteria

1. Uploading a valid image opens a staging modal on `/trips/[id]`.
2. The modal captures a Receipt Name and a payer (`paid_by`) selected from the parent trip's `participants` array.
3. Submitting inserts a row into `public.receipts`.
4. Defaults enforced: `amount = 0.00`, `split_among = []` (jsonb), and the parent `trip_id` is captured.

## Tasks / Subtasks

- [x] **Add the `receipts` migration** — `supabase/migrations/0004_receipts.sql` with the architecture `receipts` DDL (`trip_id`→`trips` on delete cascade, `name`, `amount numeric(10,2) default 0`, `paid_by`, `split_among jsonb default '[]'`, `image_url`, `processed_data jsonb`), `idx_receipts_trip_id`, idempotent. Apply in Supabase at deploy.
- [x] **RLS (NFR2)** — enable RLS + a `for all` policy keyed on the parent trip's owner (`auth.uid() = (select user_id from trips where id = trip_id)`). **Defer** the architecture's `trip_members` collaboration clause to Epic 11 (that table doesn't exist yet).
- [x] **Build the staging modal** (AC: #1,#2,#3,#4) — `components/feature/ReceiptStagingModal.tsx`, a `"use client"` dialog: Receipt Name input + `paid_by` `<select>` populated from `participants`; submit inserts `{ trip_id, name, amount: 0.00, paid_by, image_url, split_among: [] }`.
- [x] **Wire into the Trip Hub** — in `app/trips/[id]/page.tsx`, `onUploaded(url)` opens the modal (passing the uploaded `image_url` + the trip's `participants`); on success, close + confirm.
- [x] **Verify** — `npm run lint` + `npm run build` clean.

## Dev Notes

### `receipts` table (architecture source of truth)
Match `docs/04_System_Architecture_Master_v3.md`: `extensions.uuid_generate_v4()` PK, `trip_id uuid → trips(id) on delete cascade`, `name varchar(255) not null`, `amount numeric(10,2) default 0`, `paid_by varchar(255) not null`, `split_among jsonb default '[]'`, `image_url text`, `created_at`, `processed_data jsonb`. Idempotent (`create table if not exists`, `create extension if not exists`).

### RLS scope (deliberate)
Architecture's receipts policy is `owner OR trip_members`. `trip_members` is Epic 11/12 scope and isn't migrated, so use the **owner-only** clause now: `using/with check (auth.uid() = (select user_id from trips where id = trip_id))`. Epic 11 extends it with the `trip_members` `EXISTS(...)` clause. This keeps `trips` + `receipts` RLS consistent (owner-scoped) for single-user Epic 4. [Source: docs/04_System_Architecture_Master_v3.md]

### Consumes prior work
- `ReceiptUploadZone` + Trip Hub from Story 4.1 (`onUploaded(url)` is the hook — opening the modal replaces 4.1's URL-confirmation display).
- `trips.participants` (Epic 3) feeds the `paid_by` dropdown. `supabase` client (1.3); build env guard already handled (no `ci.yml` change).
- Strict ESLint: no `any`, no unused; typed form handlers; untyped `supabase.from("receipts")` is fine (no explicit `any`).

### Forward note
- `amount` stays `0.00` and `split_among` `[]` here — Epic 5 renders the line-item matrix, Epic 6 mutates `split_among`, Epic 7 computes `amount`/totals. The Trip Hub doesn't list receipts yet (that's the Epic 5 matrix); 4.2 just confirms the insert.

### Project Structure Notes
- New: `supabase/migrations/0004_receipts.sql`, `components/feature/ReceiptStagingModal.tsx`. Modified: `app/trips/[id]/page.tsx` (wire modal). "Tested" = lint + build; cloud review at the Epic 4 PR.

### References
- [Source: docs/docs/prd/epic-4/story_04_2_receipt_staging.md] — story, ACs, insert snippet
- [Source: docs/04_System_Architecture_Master_v3.md] — `receipts` table DDL + RLS
- [Source: _bmad-output/implementation-artifacts/4-1-storage-dropzone.md] — Trip Hub + `onUploaded` API

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` clean; `npm run build` clean (`/trips/[id]` dynamic, others unchanged).

### Completion Notes List

- **AC#1/#2:** uploading opens `ReceiptStagingModal`; it captures Receipt Name + a `paid_by` `<select>` populated from the trip's `participants`.
- **AC#3/#4:** submit inserts into `public.receipts` with `amount: 0.00`, `split_among: []`, `trip_id`, `paid_by`, `image_url`; name/payer validated.
- **Migration:** `0004_receipts.sql` — architecture `receipts` DDL + `idx_receipts_trip_id` + owner-based RLS (`auth.uid() = (select user_id from trips where id = trip_id)`). `trip_members` collaboration clause deferred to Epic 11. **Apply in Supabase at deploy.**
- **Wiring:** Trip Hub `onUploaded(url)` now opens the modal with the uploaded image URL; on success it closes and shows a session "Receipt added ✓" count.
- Strict ESLint clean (no `any`, no unused). Local review clean.
- Forward: `amount`/`split_among` stay at defaults — Epic 5 (matrix) lists receipts, Epic 6 mutates `split_among`, Epic 7 computes amounts.

### File List

**Added:**
- `supabase/migrations/0004_receipts.sql`
- `components/feature/ReceiptStagingModal.tsx`

**Modified:**
- `app/trips/[id]/page.tsx` (wire upload → staging modal)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | `receipts` table migration (owner RLS) + `ReceiptStagingModal` (name + payer from participants) inserting staged rows; wired into Trip Hub. Lint/build clean; local review clean. Merged into `epic-4`. | Amelia (Dev) |
