# Epic 6: JSONB Dynamic Assignment Mutations

## Overview
The goal of Epic 6 is to transition our static matrix display grid into an interactive assignment platform. Users need to be able to select and deselect checkboxes to assign specific line-item costs to participants. 

Instead of adding separate rows to a normalized relational database table, all checkbox mutations will patch a single unified document framework stored inside the `receipts.split_among` JSONB column. This keeps data writes focused, fast, and highly performance-optimized for real-time synchronization.

Additionally, this epic establishes our high-performance multimodal parsing interface, leveraging serverless route channels to stream binary receipt evidence directly to the `gemini-3.5-flash` model, instantly replacing our temporary development background delay with a live AI OCR pipeline.

## Target Architecture Blueprint
* **Database Target Matrix Column:** `public.receipts.split_among`
* **AI Extraction Target Engine:** `gemini-3.5-flash` (Structured Outputs Response Model)
* **JSONB Payload Structure:**
  ```json
  [
    { "item_id": "uuid-1", "assigned_participants": ["Mathieu", "Winston"] },
    { "item_id": "uuid-2", "assigned_participants": ["Mathieu"] }
  ]

```

* **Interaction Scope:** Toggling a checkbox or completing an upload immediately modifies the target row's array structure and commits a clean update statement to Supabase.

## Epic Backlog Registry

* **Story 6.1:** Matrix Cell Checkbox Rendering & Dynamic State Mapping Loop
* **Story 6.2:** JSONB Document Update Handlers & Partial Patch Mutations Pipeline
* **Story 6.3:** Upgraded Gemini 3.5 Flash AI OCR Ingestion Pipeline
