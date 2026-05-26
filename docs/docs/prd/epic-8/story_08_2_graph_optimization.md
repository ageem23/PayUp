# Story 8.2: Minimized Cash-Flow Debt-Graph Calculation Engine & UI Layout

### Status
**Ready for Development**

### Story
**As a** trip participant looking to square my debts,
**I want** the system to minimize the number of peer-to-peer transfers needed to settle the trip,
**so that** we can clear all group debts with the fewest possible individual transactions.

### Acceptance Criteria
1. The minimization engine processes net individual balances through a greedy debt-matching graph routing routine.
2. It iteratively pairs the group's largest absolute debtor with the largest absolute creditor, generating optimized individual repayment statements.
3. Naive circular or redundant payment structures (e.g., A owing B `$10`, and B owing C `$10`) must be fully resolved and simplified down into clean, minimal steps (e.g., A owing C `$10`).
4. The calculated instructions render beautifully inside an expandable "Settle Up Ledger" component located at the base of the main `/trips/[id]` workspace view.
5. Transactions display clear direction instructions using explicit participant name strings (e.g., `"Alice pays Mathieu $25.50"`).

### Tasks / Subtasks
- [ ] Code the network flow simplification algorithm inside `utils/math/debtMinimizer.ts`.
- [ ] Write isolated unit tests with various multi-user debt combinations to verify the math engine reduces transaction steps to their absolute mathematical minimum.
- [ ] Implement the optimization sorting architecture loop:
  ```typescript
  export function minimizeDebts(netBalances: Record<string, number>) {
    // 1. Separate participants into Creditors (positive balance) and Debtors (negative balance)
    // 2. Sort both lists by absolute value from largest to smallest
    // 3. While both lists contain active balances, match the top debtor with the top creditor
    // 4. Calculate the settlement amount min(|debt|, |credit|)
    // 5. Append transaction entry instruction to execution array list
    // 6. Update residual balances and re-sort lists dynamically
    // 7. Return minimized transaction array
  }