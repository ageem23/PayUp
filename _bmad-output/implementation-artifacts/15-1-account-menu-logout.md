# Story 15.1: Account Menu & Logout

Status: ready-for-dev

## Story

As a signed-in user,
I want an account menu with a working log-out button,
so that I can sign out and reach my account settings.

## Acceptance Criteria

1. A persistent account entry point (e.g., an avatar/name menu in the authenticated header or dashboard) is available across authenticated pages.
2. It includes a **Log out** action that calls the existing `signOut()` and returns the user to the landing/login page with no lingering session.
3. From the menu, the user can navigate to an account settings page (`/account`) — the shell that hosts Stories 15.2–15.5.
4. The entry point is shown only to authenticated users; signed-out users never see it.
5. No regression to existing navigation or page layouts.

## Tasks / Subtasks

- [ ] **Account menu component** (AC: 1, 4) — add an account entry point (avatar/name + dropdown) rendered on authenticated pages. There is no shared global header today, so place it where the authenticated chrome lives (dashboard header; carry it onto the trip pages). Gate render on `useAuth().user`.
- [ ] **Logout action** (AC: 2) — wire a "Log out" item to `signOut()` from `useAuth()`, then redirect to `/`. Confirm no session remains (subsequent protected routes bounce to landing).
- [ ] **`/account` shell route** (AC: 3) — create `app/account/page.tsx` as an authenticated page (redirect to `/` if not signed in). Minimal shell now; Stories 15.2–15.5 fill its sections. Link to it from the menu.
- [ ] **Regression check** (AC: 5) — dashboard/trip layouts unchanged aside from the added menu.
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **`signOut()` already exists** — `useAuth()` exposes `{ user, ..., signOut }` from `context/AuthContext.tsx`; this story is the missing UI, not new auth logic. [Source: context/AuthContext.tsx]
- **No global header exists.** Routes are `/`, `/dashboard`, `/dashboard/new`, `/trips/[id]`, `/trips/[id]/receipts/[receiptId]`, `/invite/[token]`. The dashboard already renders `<ProfileSelector />` (color/theme) — the account menu can sit alongside that chrome and be reused on trip pages. [Source: app/dashboard/page.tsx]
- **`/account` is the shell** the rest of the epic hangs off — keep it intentionally thin here; 15.2 (display name), 15.3 (avatar), 15.4 (prefs), 15.5 (email/password) add sections. [Source: docs/docs/prd/epic-15/epic_15_overview.md#target-architecture-blueprint]
- **No migration** — app-layer only.

### Project Structure Notes

- Add: `app/account/page.tsx` + an account-menu component (e.g. `components/feature/AccountMenu.tsx`). Touch authenticated page chrome (dashboard, trip pages).

### References

- [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-151-account-menu--logout]
- [Source: docs/docs/prd/epic-15/epic_15_overview.md#target-architecture-blueprint]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
