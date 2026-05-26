### docs/prd/epic-12/Story_12_1_Enable_Backend_RealTime.md
```markdown
# Story 12.1: Enable Backend for Real-Time Collaboration

### Status
**Approved / Ready for Dev**

### Story
**As a** developer,
**I want** to configure Supabase for temporary user sessions and update database security policies,
**so that** we have a secure foundation for real-time collaboration.

### Acceptance Criteria
1. Anonymous sign-ins are enabled in the Supabase project settings.
2. The Row Level Security (RLS) policies on all content tables (`trips`, `receipts`) are updated to allow write access to trip owners and members, as defined in the final architecture (v3.0).
3. All RLS policies correctly reference the `user_id` column on the `trips` table.
4. The security policies are tested to confirm they work as expected.

### Tasks / Subtasks
- [ ] In the Supabase dashboard, navigate to Authentication -> Providers and enable the "Anonymous Users" configuration option.
- [ ] Execute the modified v3.0 RLS schema scripts mapping `trip_members` access rules to the `receipts` table.
- [ ] Verify using the Supabase SQL simulator that anonymous user accounts cannot view or modify unassigned trip objects.