# Story 14.3: Open Signup — Whitelist Becomes a Tier, Not an Auth Wall

Status: ready-for-dev

## Story

As a new user who isn't on the invite list,
I want to sign up and use PayUp,
so that I can join a friend's trip and split a bill without needing to be pre-approved.

## Acceptance Criteria

1. A non-whitelisted user can complete sign-up (email/password and Google OAuth) and is **not** signed out or redirected to a rejection screen.
2. `applySession`, `signIn`, `signUp`, and the OAuth callback no longer treat a whitelist miss as a reason to reject the session; a held session no longer implies whitelist membership.
3. After signing in, a non-whitelisted user reaches the authenticated app (dashboard) and can view/join trips per existing RLS.
4. Whitelisted users' authentication experience is unchanged (still reach the app, still unlimited).
5. The legacy `/unauthorized` hard-reject path is retired or repurposed so that a normal non-whitelisted user is never dead-ended there.
6. The free-tier user is subject to the 14.2 quota immediately upon gaining access — there is no interval in which they can add receipts without the cap applying.

## Tasks / Subtasks

- [ ] **⛔ Sequencing gate (AC6):** confirm `0009` (14.1) and `0010` (14.2 quota) — the receipt meter — are deployed **before** merging/deploying this story. Opening the gate before the meter exists creates a window of unmetered free access. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#7-d5-gate-removal-app-layer]
- [ ] **`context/AuthContext.tsx`** (AC: 1, 2, 4)
  - [ ] `applySession()` (≈L50-71): stop signing out sessions whose email isn't in `allowed_users`. A held session is now valid regardless of tier.
  - [ ] `signIn()` (≈L94-117): remove the post-auth whitelist rejection; accept the session.
  - [ ] `signUp()` (≈L119-135): remove the pre-check that blocks non-whitelisted signups.
  - [ ] `signInWithGoogle()` (≈L137-153): no whitelist rejection on OAuth.
  - [ ] Keep / introduce a tier signal if convenient for the UI (e.g. expose `isUnlimited` via `is_unlimited_user()` RPC), but the **authoritative** tier check remains server-side (14.2). UI tier is display-only.
- [ ] **`app/auth/callback/page.tsx`** (AC: 1, 5): route an authenticated user to `/dashboard` (or safe redirect); do not bounce non-whitelisted users to `/unauthorized`.
- [ ] **`/unauthorized`** (AC: 5): retire or repurpose. A normal non-whitelisted user must never land here. (If kept for any genuine hard-error, ensure tier-miss no longer routes to it.)
- [ ] **Regression check (AC: 4):** whitelisted email/password and Google sign-in still reach the app unchanged.
- [ ] **Verify (AC: 6):** a freshly signed-up non-whitelisted account can add 3 receipts then is blocked on the 4th (proves 14.2 is live for new users).
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **The pivot story.** This is where the whitelist stops being an authentication wall and becomes a tier. Everything before it is dormant plumbing; everything after refines the experience. [Source: docs/docs/prd/epic-14/epic_14_overview.md#overview]
- **Sequencing is the only safety mechanism for AC6** — there is no DB change in this story, so the receipt cap (14.2) must already exist server-side. Do not land this first. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#7-d5-gate-removal-app-layer]
- **Current rejection points** (from the enforcement map): `AuthContext.applySession/signIn/signUp/signInWithGoogle` + `app/auth/callback/page.tsx`; the `isWhitelisted()` helper lives in `utils/auth/whitelist.ts`. After this story, `isWhitelisted` is no longer an *auth* gate — if retained, it only informs *tier* display. [Source: context/AuthContext.tsx]
- **No migration** — app-layer only.

### Project Structure Notes

- Touch: `context/AuthContext.tsx`, `app/auth/callback/page.tsx`, the `/unauthorized` route, possibly `utils/auth/whitelist.ts` (repurpose to tier signal).

### References

- [Source: docs/docs/prd/epic-14/epic_14_overview.md#story-143-open-signup--whitelist-becomes-a-tier-not-an-auth-wall]
- [Source: docs/docs/prd/epic-14/epic_14_architecture.md#7-d5-gate-removal-app-layer]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
