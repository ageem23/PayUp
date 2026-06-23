# Story 17.1: Show Who Created Each Trip

Status: done

## Story

As a user who belongs to trips created by others,
I want the dashboard to show who created each trip,
so that I can tell my own trips apart from ones shared with me.

## Acceptance Criteria

1. Each trip in the dashboard list shows its creator (owner's display name, falling back to email/initial when no display name is set).
2. Trips the current user created are visually distinguished from trips shared with them (e.g., an "owned by you" treatment vs. "shared by <name>").
3. The creator's identity is resolved through a profile read that respects privacy: a user may read the profile (display name / avatar) of users they **share a trip with**; profiles of unrelated users stay private.
4. Which trips a user can see is unchanged (owner + member visibility per existing RLS).
5. Works when the creator has no profile/display name yet (graceful fallback, no blank or error).

## Tasks / Subtasks

- [ ] **Migration `0015_profiles_comember_read.sql`** (AC: 3) — add a `SELECT` policy on `public.profiles` allowing a user to read the profile of anyone they share a trip with, reusing the existing `public.is_trip_member()` `SECURITY DEFINER` helper to avoid RLS recursion:
  ```sql
  create policy "Read profiles of trip co-members" on public.profiles
  for select using (
    auth.uid() = user_id  -- own profile (existing behavior)
    or exists (
      select 1 from public.trips t
      where t.user_id = profiles.user_id            -- they own a trip…
        and (t.user_id = auth.uid() or public.is_trip_member(t.id))  -- …I can see
    )
  );
  ```
  Keep/replace the existing self-only select policy accordingly. ⚠️ Verify no recursion (the subquery hits `trips`/`is_trip_member`, not `profiles`). Coordinate the `0015` number with any parallel session.
- [ ] **Resolve owner identity in the dashboard** (AC: 1, 5) — for each trip, fetch the owner's `display_name`/`avatar_url` from `profiles` (reuse `utils/db/profile.ts`); fall back to email/initial when absent.
- [ ] **Distinguish owned vs shared** (AC: 2) — compare `trip.user_id` to the current `user.id`; render "owned by you" vs "shared by <name>" (with avatar/initial).
- [ ] **Verify visibility unchanged** (AC: 4) — owner + member trip lists are the same set as before.
- [ ] **Manual Supabase apply** of `0015`.
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **This is the deferred co-member read from Epic 15** finally coming due — `profiles` was made self-only there; this scopes a read to trip co-members only, nothing broader. [Source: docs/docs/prd/epic-17/epic_17_overview.md#target-approach--technical-notes]
- **Avoid RLS recursion** — resolve "do we share a trip" via `is_trip_member()` (already `SECURITY DEFINER`, used by the receipts/trips policies) rather than a policy that re-queries `profiles`. [Source: supabase/migrations/0007_trip_members.sql]
- **Trip ownership** is `trips.user_id`; membership is `trip_members`. The dashboard already lists owned + member trips — this only adds the owner's identity to each row. [Source: app/dashboard/page.tsx]
- Reuse the Epic 15 profile helper rather than a new query path. [Source: utils/db/profile.ts]

### Project Structure Notes

- Add `supabase/migrations/0015_profiles_comember_read.sql`; modify `app/dashboard/page.tsx` (and any trip-card component); reuse `utils/db/profile.ts`.

### References

- [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-171-show-who-created-each-trip]
- [Source: supabase/migrations/0012_profiles.sql]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Migration `0015_profiles_comember_read.sql`: replaced the self-only profiles SELECT policy with one granting `auth.uid() = user_id` **OR** "owns a trip I can see" (via `public.trips` + `is_trip_member()` — no `profiles` re-query, so no RLS recursion). **Manual Supabase apply.**
- `fetchProfilesByIds()` in `profile.ts`: batch reads display_name/avatar for owner ids; RLS only returns readable rows, unreadable/absent owners fall back.
- Dashboard: fetches `user_id`, resolves shared-trip creators, renders **"Owned by you"** vs **"Shared by <display name>"** (falls back to "a member" when no display name — AC5). Visibility set unchanged (still owner+member via existing RLS).
- `npm run lint` + `npm run build` + `npm test` (75 tests) clean.

### File List

**Added:**
- `supabase/migrations/0015_profiles_comember_read.sql`

**Modified:**
- `utils/db/profile.ts`
- `app/dashboard/page.tsx`
