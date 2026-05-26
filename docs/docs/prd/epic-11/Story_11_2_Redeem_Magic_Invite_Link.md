---

### docs/prd/epic-11/Story_11_2_Redeem_Magic_Invite_Link.md
```markdown
# Story 11.2: Redeem Magic Invite Link

### Status
**Done**

### Story
**As a** user who has received a 'Magic Invite Link',
**I want** to click the link, log in, and be automatically added as a member to that trip,
**so that** I can start collaborating without a manual invitation.

### Acceptance Criteria
1. A new public page is created at the route `/invite/[token]`.
2. If an anonymous user visits this page, they are prompted to log in.
3. If a logged-in user visits this page, the system automatically attempts to add them as a member to the trip associated with the token.
4. After the user is successfully added as a member, they are redirected to the corresponding Trip Detail page.
5. If the invite token is invalid or disabled, the user is shown an "Invalid Invite Link" error page.

### Required Database Redemption Script
```sql
create or replace function redeem_invite_token(token_input uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  target_trip_id uuid;
  current_user_id uuid := auth.uid();
begin
  select id into target_trip_id from public.trips where invite_token = token_input;

  if found then
    insert into public.trip_members (trip_id, user_id)
    values (target_trip_id, current_user_id)
    on conflict do nothing;
    
    return target_trip_id;
  else
    raise exception 'Invalid invite token';
  end if;
end;
$$;