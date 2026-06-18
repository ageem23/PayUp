# Story 6.3: Upgraded Gemini 3.5 Flash AI OCR Ingestion Pipeline

## Status
- [x] Approved

## Story
**As a** real-time bill collaborator,  
**I want** the uploaded receipt image to be instantly processed by the Gemini 3.5 Flash model via a secure serverless Route Handler,  
**so that** the itemized matrix rows populate automatically with exact names and prices, allowing me to start checking boxes immediately.

## Acceptance Criteria
1. **Secure API Isolation:** The OCR pipeline runs exclusively inside a Next.js Server Route Handler, preventing any accidental exposure of the system's `GEMINI_API_KEY` on client-facing view layers.
2. **Multimodal Payload Ingestion:** The endpoint reads the public `imageUrl` or downloads the binary asset directly from the Supabase `receipt-images` storage bucket, passing the image data structure directly to the `gemini-3.5-flash` execution engine.
3. **Strict Schema Type-Safety:** The integration utilizes the Google Gen AI SDK's native **Structured Outputs** (`responseSchema`) features, forcing the model to return a clean JSON array that maps precisely into our `receipts.processed_data` format.
4. **Automated Column Hydration:** Upon a successful API response, the system updates the target receipt row, filling the `processed_data` column and resetting the client-side loading skeletons seamlessly.

## Structured Output Target Schema
The Gemini engine must be strictly configured to output a JSON array matching this exact data shape, allowing it to drop cleanly into your denormalized table rows:
```json
[
  { "id": "string (generate unique uuid or item key)", "name": "string (item description)", "price": 0.00 }
]

```

## Tasks / Subtasks

* [ ] **Configure Environment Access Security:** Add the verified `GEMINI_API_KEY="your_api_key_here"` value to your local configuration sheet (`.env.local`). Ensure it is excluded from git indices.
* [ ] **Scaffold Serverless Route Endpoint:** Create a dedicated serverless route file at `app/api/ocr/route.ts`.
* [ ] **Wire Google Gen AI Client Runtime:** Initialize the client client via `import { GoogleGenAI } from '@google/genai';` and pass the image buffer array into the multi-modal content generation task using the `gemini-3.5-flash` identifier.
* [ ] **Map System Instruction Controls:** Inject deterministic schema constraints into the configuration block to strip out all non-numeric currency indicators (`$`, `€`, `Total:`) from the item rows, ensuring the values pass into your database as raw floating-point numbers.
* [ ] **Write Post-Processing Database Hook:** Program the final transaction payload write straight to the target database row:
```typescript
const { data, error } = await supabase
  .from('receipts')
  .update({ processed_data: extractedJsonArray })
  .eq('id', receiptId);

```



## Dev Notes

* **Structured JSON Enforcement:** Do not rely on loose prompts or text parsing regex arrays. Initialize the client using the official `@google/genai` library, specify `responseMimeType: "application/json"`, and pass a rigid schema definition object. This forces the Gemini Flash engine to handle structural processing reliably.
* **Archived Model Prevention:** Do not down-grade this model identifier to legacy strings like `gemini-2.0-flash`. The 2.0 lineage was deprecated on June 1, 2026, and referencing those models will cause immediate network lookups exceptions.

### Testing Requirements

* **Test File Location:** `tests/integration/api/ocr.test.ts`
* **Test Standards Framework:** Jest mock routing configurations.
* **Explicit Testing Assertions:**
1. Verify the route endpoint catches missing attributes (`receiptId` / `imageUrl`) and surfaces a valid `400 Bad Request` payload.
2. Confirm the server safely marshals standard decimal fractions without dropping trailing zeroes or truncating floating points.



## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-06-18 | 3.0.0 | Refactored story index position into Epic 6 and locked inference parameters to gemini-3.5-flash. | Sarah (PO) |

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
