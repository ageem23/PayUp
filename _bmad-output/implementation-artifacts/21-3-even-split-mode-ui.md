# Story 21.3: Even-Split Mode UI

Status: ready-for-dev

## Story

As a person splitting a receipt, I want to switch a receipt to "even split" and pick who shares it, so that I can divide the whole bill without itemizing.

(Full acceptance criteria: [docs/docs/prd/epic-21/epic_21_overview.md](../../docs/docs/prd/epic-21/epic_21_overview.md#story-213-even-split-mode-ui).)

## Tasks / Subtasks

- [ ] **Mode toggle** (AC: 1) — on the receipt page, a clear **Itemized / Even split** control bound to `receipts.split_mode`. In even mode, hide the assignment matrix (`ReceiptSplitView`/`MatrixStateWrapper`) and render an even-split panel.
- [ ] **Participant multi-select + live total** (AC: 2) — checkboxes/chips over the trip's participants writing `even_split_among`; a live "**$X.XX each**" readout computed the same cent-exact way as 21.2 (`total ÷ N`), updating as the selection changes.
- [ ] **Total handling** (AC: 3) — when the receipt has items, show the derived total (`sum(items) + tax + tip`, read-only or adjustable per 21.1); when it has **no items**, show a **total input** that writes `receipts.amount`.
- [ ] **Mode switch is destructive-safe** (AC: 4) — switching modes confirms ("this clears the other mode's assignments") and, on confirm, clears the other mode's data (`split_among` ↔ `even_split_among`). Persist `split_mode` + the cleared field together.
- [ ] **paid_by unchanged** (AC: 5) — the existing "Paid by" control works in both modes.
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **Where it lives:** the receipt detail page `app/trips/[id]/receipts/[receiptId]/page.tsx` owns the receipt + `paid_by` + rename and mounts `MatrixStateWrapper → ReceiptSplitView`. The mode toggle gates whether the matrix or the even-split panel renders. [Source: app/trips/[id]/receipts/[receiptId]/page.tsx]
- **Reuse patterns:** participant selection mirrors the existing paid-by `<select>` / Epic 17 participant chips; the per-person amount reuses the 21.2 cent-exact division (extract a shared helper so UI and ledger agree).
- **Persistence:** writes go to `receipts` (`split_mode`, `even_split_among`, `amount`) via the existing supabase update path; keep the optimistic-update + save pattern used by the paid-by / fee controls.
- **Dark-mode selects:** the global `option { background: var(--background); color: var(--foreground) }` fix is already in `globals.css` — any new `<select>` inherits it.

### Project Structure Notes

- Modify `app/trips/[id]/receipts/[receiptId]/page.tsx`; likely a new `components/feature/EvenSplitPanel.tsx`. No DB change (uses 21.1's columns).

### References

- [Source: docs/docs/prd/epic-21/epic_21_overview.md#story-213-even-split-mode-ui]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
