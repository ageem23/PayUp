-- Migration: magic-invite-link token RPCs (Epic 11, Story 11.1)
-- The trips.invite_token column + unique constraint already exist (0002). These
-- SECURITY DEFINER functions let the trip OWNER mint or revoke a link token
-- without a direct (RLS-restricted) UPDATE. Apply in the Supabase SQL editor.
-- Idempotent. `set search_path = public` hardens the definer context.

-- Mint (or rotate) the invite token for a trip the caller owns.
create or replace function public.generate_invite_token(trip_id_input uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token uuid;
begin
  if not exists (
    select 1 from public.trips
    where id = trip_id_input and user_id = auth.uid()
  ) then
    raise exception 'User is not the owner of this trip';
  end if;

  new_token := extensions.uuid_generate_v4();
  update public.trips set invite_token = new_token where id = trip_id_input;
  return new_token;
end;
$$;

-- Revoke the invite token (AC5 "disable the link"). Owner-only; nulling the
-- token invalidates any outstanding link (redeem looks up by exact token).
create or replace function public.disable_invite_token(trip_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.trips
    where id = trip_id_input and user_id = auth.uid()
  ) then
    raise exception 'User is not the owner of this trip';
  end if;

  update public.trips set invite_token = null where id = trip_id_input;
end;
$$;

-- Only authenticated users may call these; the owner check inside still gates
-- per-trip access.
revoke execute on function public.generate_invite_token(uuid) from anon;
revoke execute on function public.disable_invite_token(uuid) from anon;
grant execute on function public.generate_invite_token(uuid) to authenticated;
grant execute on function public.disable_invite_token(uuid) to authenticated;
