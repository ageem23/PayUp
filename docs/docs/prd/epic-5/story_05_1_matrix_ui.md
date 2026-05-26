# Story 5.1: Mock Ingestion Data Hydration & Dual-Viewport Splitting Layout Page

### Status
**Ready for Development**

### Story
**As a** frontend user interface engineer,
**I want** to design a responsive matrix layout that maps an array of item objects against a dynamic list of participant columns,
**so that** I can establish the absolute baseline user layout independently of background AI parser completions.

### Acceptance Criteria
1. Navigating to the dynamic route path `/trips/[id]/receipts/[id]` pulls the parent trip record and targeted receipt row configuration parameters cleanly.
2. The UI splits into a dual-viewport framework on wide screens: the left pane locks a placeholder container for the physical receipt image, and the right pane loads the primary assignment table.
3. The main matrix grid successfully loops through a mock structure stored inside `receipts.processed_data`, rendering a unique row for every itemized item showing its description name and baseline cost amount.
4. The columns of the matrix table dynamically expand horizontally, automatically adding a column header name cell for every individual name string found within the `trips.participants` array list.

### Tasks / Subtasks
- [ ] Establish the core receipt split presentation view page segment file at `app/trips/[tripId]/receipts/[receiptId]/page.tsx`.
- [ ] Program a responsive Tailwind parent container wrapper optimizing widescreen grid layouts (`grid grid-cols-1 lg:grid-cols-2 gap-6`).
- [ ] Build the skeletal framework of the interactive assignment table using semantically correct HTML tags (`<table>`, `<thead>`, `<tbody>`, `<tr>`).
- [ ] Map a header mapping loop to populate the columns row:
  ```typescript
  {currentTrip.participants.map((personString) => (
    <th key={personString} className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
      {personString}
    </th>
  ))}