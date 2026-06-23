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

  -- Validate caller-supplied input before persisting (this is a SECURITY DEFINER
  -- entrypoint, so a member could call it directly). Reject a null array or any
  -- null/blank name so downstream participant logic never sees invalid strings.
  if p_names is null then
    raise exception 'Participants list cannot be null';
  end if;

  if exists (
    select 1
    from unnest(p_names) as n(name)
    where n.name is null or btrim(n.name) = ''
  ) then
    raise exception 'Participants must be non-empty strings';
  end if;

  -- Authorization and the scoped write happen in ONE statement (no TOCTOU gap):
  -- only the participants column changes, and only for the trip owner or an
  -- approved member. is_trip_member() is itself SECURITY DEFINER (0007), so this
  -- doesn't depend on the caller's own RLS visibility of trip_members.
  update public.trips t
    set participants = to_jsonb(p_names)
    where t.id = p_trip_id
      and (t.user_id = auth.uid() or public.is_trip_member(t.id));

  if not found then
    raise exception 'Not authorized to edit this trip';
  end if;
end;
$$;

revoke execute on function public.set_trip_participants(uuid, text[]) from public;
grant execute on function public.set_trip_participants(uuid, text[]) to authenticated;
