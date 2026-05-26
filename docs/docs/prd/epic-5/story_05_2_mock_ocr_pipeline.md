### `docs/epics/epic-05-matrix-rendering/story_05_2_mock_ocr_pipeline.md`
```markdown
# Story 5.2: Asynchronous Ingestion Mock Endpoint & Client State Hydration Hook

### Status
**Ready for Development**

### Story
**As a** systems developer,
**I want** to build an asynchronous mock data injector script that automatically seeds structured items into a receipt right after creation,
**so that** the application acts as if it completed an AI scanning step while we wait to integrate real OCR tools.

### Acceptance Criteria
1. Creating a receipt safely triggers an internal database function, server route, or mock backend script that simulates a 2-second background processing delay.
2. Upon processing completion, the routine automatically updates that specific receipt's `processed_data` column with a valid JSON array of individual item lines, descriptions, and prices.
3. The frontend view displays a clean loading spinner or skeletons placeholder state if `processed_data` is empty or null, and automatically refreshes its data layer to show the matrix table as soon as the background insertion finishes.

### Tasks / Subtasks
- [ ] Create a client-side data fetching hook or loading interface controller inside `components/feature/MatrixStateWrapper.tsx`.
- [ ] Draft a mock server routine, client-side timeout hook, or Supabase PostgreSQL RPC function that simulates background parsing latency:
  ```typescript
  // Simulated background parsing engine mockup
  setTimeout(async () => {
    const mockExtractedLines = [
      { "id": crypto.randomUUID(), "name": "Woodfired Margherita Pizza", "price": 19.00 },
      { "id": crypto.randomUUID(), "name": "House Red Wine Carafe", "price": 24.00 },
      { "id": crypto.randomUUID(), "name": "Sparkling Water", "price": 4.50 }
    ];
    
    await supabase
      .from('receipts')
      .update({ processed_data: mockExtractedLines })
      .eq('id', activeReceiptId);
  }, 2000);