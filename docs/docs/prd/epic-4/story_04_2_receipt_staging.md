### `docs/epics/epic-04-receipt-ocr/story_04_2_receipt_staging.md`
```markdown
# Story 4.2: Receipt Metadata Transaction Staging & Parent Trip Association

### Status
**Ready for Development**

### Story
**As a** traveler adding costs to a group ledger,
**I want** to confirm a receipt name, indicate who paid for it, and register the base row entry,
**so that** I can stage the bill container for line-item processing.

### Acceptance Criteria
1. Uploading a valid image file fires an interactive overlay modal on the current route `/trips/[id]`.
2. The modal captures data inputs for the Receipt Name and a selection menu populated with strings from the parent trip's `trips.participants` array list to define the payer (`paid_by`).
3. Submitting the staged modal commits a clean row entry directly to the `public.receipts` table.
4. The record enforces default structural states: initializing `amount` to `0.00`, setting `split_among` to an empty JSONB array (`'[]'::jsonb`), and capturing the absolute `trip_id` reference pointer.

### Tasks / Subtasks
- [ ] Create an interactive dialog container layout element at `components/feature/ReceiptStagingModal.tsx`.
- [ ] Implement form tracking elements to handle input strings for receipt descriptive headers.
- [ ] Wire up a selection dropdown reading participant string lists directly out of the existing trip context data structure to populate the `paid_by` input option field.
- [ ] Program the mutation handler function to insert records directly down into the tracking index:
  ```typescript
  const { data, error } = await supabase
    .from('receipts')
    .insert([
      {
        trip_id: currentTripId,
        name: receiptFormName,
        amount: 0.00,
        paid_by: designatedPayerString,
        image_url: uploadedPublicUrl,
        split_among: [] // Pre-seed empty JSONB list mapping matrix
      }
    ]);