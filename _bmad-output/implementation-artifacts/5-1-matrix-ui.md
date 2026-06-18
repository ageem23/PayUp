---
baseline_commit: c675a678b5153935547df8535c91d49905cede31
---

# Story 5.1: Mock Ingestion Data Hydration & Dual-Viewport Splitting Layout Page

Status: done

## Story

As a frontend engineer,
I want a responsive matrix that maps a receipt's item rows against a dynamic set of participant columns,
so that the baseline split-bill layout exists independently of AI parsing.

## Acceptance Criteria

1. `/trips/[id]/receipts/[receiptId]` loads the parent trip and the target receipt.
2. Wide screens split into two panes (`grid-cols-1 lg:grid-cols-2`): left = receipt image (or placeholder), right = the assignment table.
3. The table loops `receipts.processed_data` (mock line items), one row per item showing its name + cost.
4. The table adds one column header per name in `trips.participants` (dynamic width).

## Tasks / Subtasks

- [x] **Create the matrix page** (AC: #1,#2,#3,#4) — `app/trips/[id]/receipts/[receiptId]/page.tsx`, a `"use client"`, auth-guarded page.
  - ⚠️ **Use `[id]` for the trip segment, NOT `[tripId]`.** Epic 4 created `app/trips/[id]/`; Next.js forbids two slug names for the same segment (`id` vs `tripId`). Params: `useParams<{ id: string; receiptId: string }>()`.
- [x] **Load data** — owner-scoped: trip (`id,name,participants` where `id` + `user_id`) and receipt (`id,name,image_url,processed_data` where `id` + `trip_id`). RLS enforces ownership; "not found" fallback if either misses.
- [x] **Dual-viewport** — `grid grid-cols-1 lg:grid-cols-2 gap-6`; left pane shows `<img>` of `image_url` (or a placeholder block), right pane the table.
- [x] **Matrix table** — semantic `<table>`: header row `Item | Cost | {participant headers}`; body rows from `processed_data` items (`name`, `price`), with empty per-participant cells (assignment checkboxes come in Epic 6).
- [x] **Verify** — `npm run lint` + `npm run build` clean.

## Dev Notes

### Data shapes
- `processed_data` is `jsonb` (set by the Story 5.2 mock). Treat as `LineItem[] | null` where `LineItem = { id: string; name: string; price: number }`; guard with `Array.isArray` before mapping (it may be null/empty until 5.2 hydrates it).
- `participants` is `string[] | null` (Epic 3); default to `[]`.
- Untyped supabase client → assert fetched rows to local types (assertion, not `any`).

### Scope split with 5.2
- **5.1 renders** the matrix from whatever `processed_data` holds (empty → a "No items yet" state for now).
- **5.2 hydrates**: `MatrixStateWrapper` shows a skeleton while `processed_data` is empty, fires the ~2s mock OCR to populate it, and refreshes. 5.1's page should render cleanly with empty data so 5.2 can layer the loading/mock on top.
- Cells (item × participant) are placeholders here; **Epic 6** adds the assignment checkboxes + `split_among` mutations, **Epic 7** computes amounts.

### Consumes prior work
- Trip Hub `/trips/[id]` + `receipts`/`trips` tables + RLS (Epic 4/3); `useAuth()` + `AuthProvider` (Epic 2); `supabase` client (1.3). Build env guard handled (CI placeholders + `.env.local`) — no `ci.yml` change.
- Strict ESLint: no `any`, no unused; `useParams`/`useRouter` from `next/navigation`; `next/image` not required (a plain `<img>` with a placeholder is fine — if ESLint `@next/next/no-img-element` warns, use a justified comment or `next/image`).

### Project Structure Notes
- New: `app/trips/[id]/receipts/[receiptId]/page.tsx`. "Tested" = lint + build; cloud review at the Epic 5 PR.
- (Optional nicety) link each Trip Hub receipt to its matrix page — but the Trip Hub doesn't list receipts yet; navigation from staging is wired in 5.2. Keep 5.1 to the page itself.

### References
- [Source: docs/docs/prd/epic-5/story_05_1_matrix_ui.md] — story, ACs, header-map snippet
- [Source: docs/docs/prd/epic-5/epic_05_overview.md] — `processed_data` matrix, participant columns, `/trips/[id]/receipts/[id]`
- [Source: _bmad-output/implementation-artifacts/4-2-receipt-staging.md] — `receipts` schema (`processed_data`, `image_url`)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` clean; `npm run build` → `ƒ /trips/[id]/receipts/[receiptId]` builds (dynamic).

### Completion Notes List

- **AC#1:** owner-scoped parallel load of trip + receipt (`Promise.all`, `maybeSingle`); "Receipt not found" fallback.
- **AC#2:** `grid grid-cols-1 lg:grid-cols-2` — left pane shows the receipt `image_url` (placeholder block if none), right pane the table.
- **AC#3:** table body maps `processed_data` items → `Item | Cost` rows (`Array.isArray` guarded; empty → "No items yet" until 5.2 hydrates).
- **AC#4:** header adds one column per `trips.participants` name; per-participant body cells are placeholders (Epic 6 adds assignment checkboxes).
- **Route slug:** used `app/trips/[id]/receipts/[receiptId]` (NOT `[tripId]`) to avoid Next's same-segment slug conflict with Epic 4's `app/trips/[id]`.
- `<img>` for the external Supabase URL with a justified `@next/next/no-img-element` disable (keeps lint clean; avoids `remotePatterns` config). No `any`, no unused.

### File List

**Added:**
- `app/trips/[id]/receipts/[receiptId]/page.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Receipt matrix page at `/trips/[id]/receipts/[receiptId]` — dual-viewport (image + table), participant columns, rows from `processed_data`. Lint/build clean; local review clean. Merged into `epic-5`. | Amelia (Dev) |
| 2026-06-18 | 1.2.0 | CodeRabbit (Epic 5 PR #8): added a safe `formatPrice` guard (malformed jsonb price can't crash `toFixed`) and a "No items yet" empty-table fallback row. | Amelia (Dev) |
