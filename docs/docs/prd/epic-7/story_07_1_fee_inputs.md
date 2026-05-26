# Story 7.1: Global Operational Expense Overrides & Fee Input Components

### Status
**Ready for Development**

### Story
**As a** trip organizer managing a complex group bill,
**I want** high-visibility entry fields to input the exact total tax and tip amounts printed on the receipt,
**so that** the computational engine has the base constants required to run proportional scaling calculations.

### Acceptance Criteria
1. The sidebar or header panel within `ReceiptSplittingView` provides dedicated numeric text input boxes for "Tax ($)" and "Tip ($)".
2. Inputs handle standard floating-point numbers gracefully, automatically stripping non-numeric values and preventing negative integers.
3. Modifying an input instantly updates the internal memory tracking model (`receiptState`), setting up the data constants required for immediate math updates.
4. Input fields save their states down to the database row on change, preserving inputs when the page is reloaded.

### Tasks / Subtasks
- [ ] Create input override interface wrappers inside `components/feature/ReceiptSummarySidebar.tsx`.
- [ ] Add explicit HTML numeric attribute layouts to the entry elements:
  ```tsx
  <input 
    type="number" 
    step="0.01"
    min="0"
    placeholder="0.00"
    value={taxInput}
    onChange={(e) => handleFeeUpdate('tax', parseFloat(e.target.value) || 0)}
    className="w-full text-right font-mono border rounded p-2"
  />