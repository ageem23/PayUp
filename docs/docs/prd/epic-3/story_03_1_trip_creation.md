# Story 3.1: Trip Creation Form & JSONB Participant String Array Serialization

### Status
**Ready for Development**

### Story
**As a** trip organizer,
**I want** to fill out a unified trip name form and add an arbitrary list of attendee names on a single screen,
**so that** I can instantly establish a shared billing boundary for my friends without clicking through multiple setup wizards.

### Acceptance Criteria
1. Navigating to the page `/dashboard/new` loads an interactive form requiring a Trip Name.
2. The form features a dynamic, multi-entry list component where typing a name and hitting enter or clicking "Add" appends that name to a visible local list.
3. Submitting the form posts a unified structural payload straight to `public.trips` via Supabase client functions.
4. The submitted metadata must serialize the participant names exactly into a flat JSONB format array string inside the row: e.g. `["Alice", "Bob", "Charlie"]`.
5. The active `user_id` user tracking token must be securely stamped to the trip record as the absolute master owner.

### Tasks / Subtasks
- [ ] Establish the client form viewport file template at `app/dashboard/new/page.tsx`.
- [ ] Build a responsive input text form using Tailwind parameters to capture the master trip label attribute.
- [ ] Build an interactive React list component tracking a state array string array (`participantsList`, `setParticipantsList`).
- [ ] Attach a simple list item chip engine displaying entered participant names with a "Remove" (X) toggle button element.
- [ ] Program the form submission payload function interfacing directly with the database client structure:
  ```typescript
  const { data, error } = await supabase
    .from('trips')
    .insert([
      { 
        name: tripName, 
        participants: participantsList, // Array seamlessly marshalled to JSONB
        user_id: user.id 
      }
    ])
    .select()
    .single();