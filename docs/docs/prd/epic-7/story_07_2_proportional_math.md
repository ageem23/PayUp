### `docs/epics/epic-07-precision-math/story_07_2_proportional_math.md`
```markdown
# Story 7.2: Single-Cent Proportional Multiplier Math & Remainder Distribution Engine

### Status
**Ready for Development**

### Story
**As a** participant splitting an itemized receipt,
**I want** my share of the tax and tip to match my exact proportion of food consumption,
**so that** I do not unfairly subsidize other members' high-ticket items.

### Acceptance Criteria
1. The calculation runtime computes each user's base individual subtotal by evaluating their checkbox assignments inside `receipts.split_among`. If an item cost is shared by multiple people, its price is divided equally among them first.
2. Individual tax and tip allocations are computed using the fractional multiplier formula:
   $$\text{Individual Fee Share} = \text{Global Fee Constant} \times \left( \frac{\text{Individual Subtotal}}{\text{Total Bill Subtotal}} \right)$$
3. All intermediate currency operations are rounded cleanly to two decimal places ($0.01) to mimic real-world cash limits.
4. If rounding divisions produce leftover fraction-of-a-cent discrepancies (e.g., summing individual totals equals `$100.01` instead of the explicit grand total `$100.00`), a deterministic remainder-distribution algorithm allocates the extra pennies to the highest consumer's share, ensuring the final ledger balance balances perfectly.

### Tasks / Subtasks
- [ ] Program a pure mathematical calculation utility file at `utils/math/billCalculations.ts`.
- [ ] Write a test pipeline suite targeting multiple fractional splitting variations (e.g., three people sharing a `$10.00` item with a `$1.00` tip) to verify that calculation results never drop penny remainders.
- [ ] Code the proportional multiplier and remainder allocation function:
  ```typescript
  export function calculateProportionalSplit(
    items: Array<{ id: string; price: number }>,
    splitAmong: Array<{ item_id: string; assigned_participants: string[] }>,
    participants: string[],
    globalTax: number,
    globalTip: number
  ) {
    // 1. Calculate base individual subtotals
    // 2. Compute proportional shares for tax and tip
    // 3. Evaluate rounding remainders: totalCalculated Sum vs Explicit Grand Total
    // 4. Allocate remainder pennies to the highest spending participant's ledger slot
    // 5. Return structured mapping totals for display
  }