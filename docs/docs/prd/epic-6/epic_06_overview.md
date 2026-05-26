# Epic 6: JSONB Dynamic Assignment Mutations

## Overview
The goal of Epic 6 is to transition our static matrix display grid into an interactive assignment platform. Users need to be able to select and deselect checkboxes to assign specific line-item costs to participants. 

Instead of adding separate rows to a normalized relational database table, all checkbox mutations will patch a single unified document framework stored inside the `receipts.split_among` JSONB column. This keeps data writes focused, fast, and highly performance-optimized for real-time synchronization.

## Target Architecture Blueprint
* **Database Target Matrix Column:** `public.receipts.split_among`
* **JSONB Payload Structure:** ```json
  [
    { "item_id": "uuid-1", "assigned_participants": ["Mathieu", "Winston"] },
    { "item_id": "uuid-2", "assigned_participants": ["Mathieu"] }
  ]