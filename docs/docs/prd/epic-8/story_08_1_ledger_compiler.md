# Story 8.1: Cross-Receipt Balance Aggregation & Ledger Compile Functions

### Status
**Ready for Development**

### Story
**As a** system developer,
**I want** a background processing function to compile data from all receipts within a trip,
**so that** I can calculate each participant's singular net debt or credit standing across the entire trip history.

### Acceptance Criteria
1. The compilation utility successfully queries and loops through all child records in the `public.receipts` table associated with a given `trip_id`.
2. For each receipt, the routine computes:
   * **Paid Credit:** Spoken for by the `paid_by` participant name string.
   * **Consumed Debt:** Each individual's calculated penny-accurate share of that receipt (using the precision engine from Epic 7).
3. The function subtracts total consumed debts from total paid credits for each unique name string, outputting a flat dictionary of net standings (e.g., `{"Mathieu": +45.50, "Winston": -20.00, "Alice": -25.50}`).
4. The sum of all net balances across the participant list must equal exactly `0.00` to confirm mathematical accounting balance.

### Tasks / Subtasks
- [ ] Create a comprehensive data compilation script file inside `utils/math/ledgerCompiler.ts`.
- [ ] Program a query operation that fetches all active receipt rows attached to the designated parent trip ID.
- [ ] Write the aggregation parsing loops to process total paid sums against individual breakdown points across all loaded rows.
- [ ] Build a validation safeguard: if the total combined sum of net credit/debit standings does not check out to exactly `0.00` (in cents), halt execution and trigger a telemetry log warning.

### Dev Notes
* Always calculate balances using absolute integer cent points throughout the loop, converting back to floating-point decimals only for the final output object wrapper. This prevents JavaScript rounding errors from accumulating across multiple receipt totals.

### Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-05-26 | 1.0.0 | Initialized cross-receipt data aggregator parameters. | John (PM) |