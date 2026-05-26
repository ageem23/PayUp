# Story 10.1: Matrix Interaction History Generation & Timestamped Log Component

### Status
**Ready for Development**

### Story
**As a** group member splitting a crowded invoice,
**I want** a readable running activity feed visible below the main grid,
**so that** I can easily review the timeline of updates and trace any calculation modifications.

### Acceptance Criteria
1. Whenever a checkbox mutation or cost override occurs, the local state handler automatically generates an activity record containing an event string, user identifier, and high-resolution timestamp.
2. The `ReceiptSplittingView` features an expandable timeline drawer container labeled "View Activity History".
3. The history panel beautifully loops through the collection of events, formatting data parameters into user-friendly strings (e.g., `"[4:12 PM] Winston assigned 'Cold Brew Coffee' to Mathieu"`).
4. The timeline automatically places the newest event item at the top of the feed to ensure immediate visibility.

### Tasks / Subtasks
- [ ] Create a structured data interface model inside a global declaration file at `types/audit.ts`:
  ```typescript
  export interface AuditLogEntry {
    id: string;
    timestamp: string;
    actorName: string;
    actionDescription: string;
  }