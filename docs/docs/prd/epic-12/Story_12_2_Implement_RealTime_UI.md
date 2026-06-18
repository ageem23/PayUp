# Story 12.2: Implement Real-Time Collaboration UI

### Status
**Ready for Development**

### Story
**As a** collaborating user,
**I want** my changes to save automatically and see changes from others in real-time,
**so that** we can work on splitting a receipt together seamlessly.

### Acceptance Criteria
1. When an anonymous user visits a public invite link, they are automatically signed in with a temporary session via `supabase.auth.signInAnonymously()`.
2. When the `ReceiptSplittingView` loads, it initializes a Supabase Real-Time stream subscription explicitly targeting the receipt object string value.
3. Every individual configuration change (updating custom checkboxes or names) dispatches an optimistic transaction straight to the database and broadcasts the matching mutation structure over the real-time channel.
4. The manual structural "Save" buttons are deleted from the frontend viewport layout.
5. Inbound channel notifications incoming from remote actors mutate the active UI engine view instantly without causing form reset bugs or infinite execution feedback loops.