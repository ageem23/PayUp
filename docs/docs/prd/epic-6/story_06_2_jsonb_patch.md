# Story 6.2: JSONB Document Update Handlers & Partial Patch Mutations Pipeline

## Status
- [x] Approved

## Story
**As a** real-time expense collaborator,  
**I want** my checkbox clicks to automatically merge state patches straight into the database row,  
**so that** my structural split-allocations auto-save to the cloud instantly without manual button submission overhead.

## Acceptance Criteria
1. **Partial JSONB State Resolution:** Toggling a checkbox matrix intersection executes a localized javascript reducer that calculates a deep patch array structure mapping participants to items.
2. **Atomic Column Writes:** The updated memory document is pushed to Supabase using a singular `update` operation targeting the corresponding `public.receipts.id` primary key.
3. **Payload Data Integrity:** The write handler replaces the `split_among` node while ensuring it preserves matching item structures across unrelated lines within the block.
4. **Visual Sync Affirmation:** The interface renders a subtle async spinner or status flag in the application navigation header which transitions between `"Saving updates..."` and `"All changes saved"` to match client connection hooks.

## Tasks / Subtasks
- [ ] **Establish Database Patch Hook:** Create a core data mutation engine at `utils/db/matrixPatch.ts` to transform memory checkbox grids into a clean array matching our architectural constraint.
- [ ] **Program the Update Handler Strategy:** Code the asynchronous update function interfacing directly with the initialized Supabase JavaScript client reference:
```typescript
  export async function patchReceiptSplits(
    receiptId: string, 
    updatedSplitAmongPayload: Array<{ item_id: string; assigned_participants: string[] }>
  ) {
    const { data, error } = await supabase
      .from('receipts')
      .update({ split_among: updatedSplitAmongPayload })
      .eq('id', receiptId)
      .select();
    
    if (error) throw error;
    return data;
  }