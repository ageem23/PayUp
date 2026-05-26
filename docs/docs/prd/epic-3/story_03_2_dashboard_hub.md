### `docs/epics/epic-03-trip-management/story_03_2_dashboard_hub.md`
```markdown
# Story 3.2: Trip Management Workspace Dashboard Hub Layout

### Status
**Ready for Development**

### Story
**As an** active platform user,
**I want** a centralized landing dashboard showing all my trips and their respective settlement statuses,
**so that** I can easily access my financial summaries or start a new group checkout.

### Acceptance Criteria
1. The route path `/dashboard` loads a clean grid layout pulling data records directly from the `public.trips` table.
2. The data transaction must query rows matching the active authenticated user's profile ID tracking boundary (`user_id`).
3. Each item panel must display the trip title, creation timestamp value formatted cleanly, and a visible indicator chip highlighting whether the collection is settled (`is_settled` boolean flag).
4. Clicking an item panel triggers a secure navigation transition to the individual trip details sheet at `/trips/[id]`.
5. A prominent button labeled "+ Create New Trip" must stay visible to immediately link users to the setup form context.

### Tasks / Subtasks
- [ ] Create the central dashboard layout viewport template file at `app/dashboard/page.tsx`.
- [ ] Wire up a clean `useEffect` state load sequence fetching database table references matching user credentials.
- [ ] Create an explicit validation check layer: if no trip records exist for the account profile, display a friendly placeholder state block prompting them to create their first workspace.
- [ ] Format visual display properties using Tailwind utility layout elements (`grid grid-cols-1 md:grid-cols-3 gap-4`).
- [ ] Connect individual cards to high-performance link pathways wrapping the absolute trip identifier parameter: `href={`/trips/${trip.id}`}`.

### Dev Notes
* At this stage, do not build the complex member collaboration lookups into the main query. Keep the dashboard filter limited strictly to checking if `user_id === auth.uid()`. We will expand this layout cleanly when we implement Epic 11's member access tables.

### Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-05-26 | 1.0.0 | Drafted aggregate overview display components. | John (PM) |