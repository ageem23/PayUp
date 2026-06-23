-- Migration: member-capable participant editing (Epic 17, Story 17.4).
-- The trips UPDATE RLS is owner-only (0002), but participants are collaborative
-- (members edit receipts that reference those names). RLS can't restrict WHICH
-- columns an UPDATE touches, so a member-capable, column-scoped write goes
-- through this SECURITY DEFINER RPC: it updates ONLY trips.participants and only
-- for the trip owner or an approved member — name / is_settled stay owner-only.
-- Apply in the Supabase SQL editor. Idempotent.

create or replace function public.set_trip_participants(
  p_trip_id uuid,
  p_names text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Owner OR approved member may edit the participant labels. is_trip_member()
  -- is itself SECURITY DEFINER (0007), so this doesn't depend on the caller's
  -- own RLS visibility of trip_members.
  if not exists (
    select 1 from public.trips t
    where t.id = p_trip_id
      and (t.user_id = auth.uid() or public.is_trip_member(t.id))
  ) then
    raise exception 'Not authorized to edit this trip';
  end if;

  -- Scoped write: only the participants column changes.
  update public.trips
    set participants = to_jsonb(p_names)
    where id = p_trip_id;
end;
$$;

revoke execute on function public.set_trip_participants(uuid, text[]) from public;
grant execute on function public.set_trip_participants(uuid, text[]) to authenticated;
