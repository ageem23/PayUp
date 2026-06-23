# Story 15.4: Preferences That Follow the User

Status: ready-for-dev

## Story

As a user who switches devices,
I want my theme and accent color saved to my account,
so that I don't have to reconfigure them everywhere.

## Acceptance Criteria

1. Theme (dark/light) and accent color persist to the user's `profiles` row, not only `localStorage`.
2. On load, the persisted preference hydrates the UI; `localStorage` remains a pre-hydration cache so there is no theme flash.
3. Changing a preference updates the DB (and the cache); the change is reflected in another session/device after refresh.
4. Signed-out users (and users with no profile yet) still get sensible defaults with no errors.
5. The existing Epic 9 `ProfileSelector` UX (color choices + theme toggle) is preserved — only the persistence layer changes.

## Tasks / Subtasks

- [ ] **Migration `0014_profile_preferences.sql`** (AC: 1) — depends on `0012` (profiles).
  - [ ] `alter table public.profiles add column theme text, add column accent_color text;` (nullable → null means "use default"; optionally `check` constraints for the known accent values: indigo/emerald/rose/amber/cyan/teal).
  - [ ] ⚠️ Coordinate the migration number (`0014`) with any parallel session.
- [ ] **Wire `ThemeContext` + `AccentColorContext` to the DB** (AC: 1, 2, 3, 4)
  - [ ] On first paint, read from `localStorage` (keys `app-theme`, `app-accent-color`) to avoid a flash; then reconcile with the profile row once the session/profile loads.
  - [ ] On change, write to both the profile (`supabase.from('profiles').update`) and `localStorage` (cache).
  - [ ] Signed-out / no-profile → fall back to defaults; never throw.
- [ ] **Preserve `ProfileSelector`** (AC: 5) — same component, same options/toggle; only the persistence beneath it changes. [Source: app/dashboard/page.tsx]
- [ ] **Cross-device check** (AC: 3) — set a preference in one session, confirm it loads in a fresh session after refresh.
- [ ] **Manual Supabase apply** of `0014`.
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **DB is source of truth; `localStorage` is the cache** — the cache is what kills the theme flash on first paint (`AccentColorContext.tsx` already notes a one-frame default→saved is acceptable). Reconcile DB → cache on login. [Source: context/AccentColorContext.tsx]
- **Existing keys:** `app-theme` (`context/ThemeContext.tsx`), `app-accent-color` (`context/AccentColorContext.tsx`). Keep them as the cache layer. [Source: context/ThemeContext.tsx]
- **Depends on 15.2** — `theme`/`accent_color` are columns on the `profiles` table.
- **Defaults for the un-signed-in landing page** must still work (the marketing/login page renders before any profile exists).

### Project Structure Notes

- Add `supabase/migrations/0014_profile_preferences.sql`; modify `context/ThemeContext.tsx`, `context/AccentColorContext.tsx`; reuse `utils/db/profile.ts`.

### References

- [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-154-preferences-that-follow-the-user]
- [Source: context/AccentColorContext.tsx]
- [Source: context/ThemeContext.tsx]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
