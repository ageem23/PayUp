# Story 11.1: Generate and Manage Invite Links

### Status
**Ready for Development**

### Story
**As a** trip owner,
**I want** to generate a unique 'Magic Invite Link' for my trip and manage its status,
**so that** I can easily and securely share editing access.

### Acceptance Criteria
1. On the Trip Detail page, a "Share" section is visible only to the trip owner.
2. The section contains a button to "Generate Invite Link".
3. Clicking the button generates a unique, shareable link and displays it.
4. The owner can copy the link to their clipboard.
5. The owner has an option to disable the link, which invalidates it.

### Required Database Elements (Supabase RPC)
```sql
CREATE OR REPLACE FUNCTION generate_invite_token(trip_id_input UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM trips 
    WHERE id = trip_id_input AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not the owner of this trip';
  END IF;

  new_token := uuid_generate_v4();
  UPDATE trips
  SET invite_token = new_token
  WHERE id = trip_id_input;
  
  RETURN new_token;
END;
$$;