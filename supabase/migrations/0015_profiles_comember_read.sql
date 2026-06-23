-- Migration: co-member profile read (Epic 17, Story 17.1). Depends on 0012.
-- Epic 15 made public.profiles self-only. This narrowly widens SELECT so a user
-- can read the profile (display name / avatar) of someone who OWNS a trip the
-- user can see (owns or is a member of) — enough to show "who created this trip"
-- on the dashboard, without exposing profiles broadly. Apply in the Supabase SQL
-- editor. Idempotent.
--
-- Recursion note: the co-member test goes through public.trips and the existing
-- SECURITY DEFINER public.is_trip_member() helper — neither re-queries
-- public.profiles — so this SELECT policy does not recurse.

-- Replace the self-only read policy (0012) with one that also covers the
-- co-member case. (auth.uid() = user_id still grants reading your own profile.)
drop policy if exists "Users read their own profile" on public.profiles;
drop policy if exists "Read profiles of trip co-members" on public.profiles;
create policy "Read profiles of trip co-members" on public.profiles
  for select using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.trips t
      where t.user_id = profiles.user_id
        and (t.user_id = auth.uid() or public.is_trip_member(t.id))
    )
  );
