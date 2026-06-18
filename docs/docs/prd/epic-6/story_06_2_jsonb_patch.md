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

```

* [ ] **Inject Optimistic Status Badging:** Build an auto-save network tracking indicator within `components/feature/SyncStatusBar.tsx`. Wire its internal lookups to local state-reduction variables tracking network round-trip states.
* [ ] **Bind Mutations to UI Intersections:** Connect the patch execution module directly into the `onChange` event parameters of our functional checkbox cell primitives (`MatrixCell.tsx`), eliminating old mock save buttons entirely.

## Dev Notes

* **Data Mutation Isolation Guardrail:** Remember that `split_among` is a flat JSONB column block inside a single database row. When editing item $X$, do not overwrite or drop lines for item $Y$. You must construct the patch array by reading the current state cache, altering only the single matching `item_id` node, and dispatching the unified full payload block.
* **TypeScript Types Anchor:** Enforce structural type safety by enforcing object parsing checks against our global type models:
```typescript
export interface ReceiptSplitAllocation {
  item_id: string;
  assigned_participants: string[];
}

```



### Testing Requirements

* **Test File Location:** `tests/integration/db/matrixPatch.test.ts`
* **Test Standards Framework:** Jest runner suite executing transactions.
* **Explicit Testing Assertions:**
1. Verify passing an updated `assigned_participants` array pushes modifications to the tracking node accurately.
2. Confirm passing zero participants leaves an empty brackets list (`[]`) intact inside the document field instead of setting the database cell parameter to `NULL`.



## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-06-18 | 2.0.0 | Re-sharded into Epic 6 structure with strict parameter constraints. | Sarah (PO) |

## Dev Agent Record

*(This section is reserved for the development agent to record execution metadata during implementation cycles.)*

### Agent Model Used

*TBD*

### Debug Log References

*TBD*

### Completion Notes List

* [ ] Subtask execution logs...

### File List

*TBD*

## QA Results

*(This section is reserved for senior QA review signatures and refactor auditing logs.)*
*TBD*