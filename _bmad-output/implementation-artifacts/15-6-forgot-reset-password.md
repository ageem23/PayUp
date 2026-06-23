# Story 15.6: Forgot / Reset Password

Status: ready-for-dev

## Story

As a user who forgot my password,
I want to reset it via an email link,
so that I can regain access to my account.

## Acceptance Criteria

1. The login/landing page offers a "Forgot password?" entry that collects an email and calls `resetPasswordForEmail()`.
2. A public recovery page consumes the Supabase recovery token and lets the user set a new password.
3. The confirmation message is shown regardless of whether the email belongs to an account (no account enumeration).
4. After a successful reset, the user can sign in with (or is signed in via) the new password.
5. Expired or invalid recovery links show a clear message and a path to request a new one.

## Tasks / Subtasks

- [ ] **"Forgot password?" entry** (AC: 1, 3) — on `app/page.tsx` (login form), add a link/flow that collects an email and calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: <reset page URL> })`. Always show the same "check your email" confirmation — never reveal whether the address exists.
- [ ] **Recovery page** (AC: 2, 4, 5) — add `app/reset-password/page.tsx` (public). Supabase establishes a recovery session from the email link; the page lets the user set a new password via `supabase.auth.updateUser({ password })`, then routes them to the app / sign-in.
- [ ] **Invalid/expired link handling** (AC: 5) — if no valid recovery session/token is present, show a clear message and a link back to "Forgot password?" to request a fresh one.
- [ ] **Supabase config dependency** — the `redirectTo` URL must be in the project's allowed redirect URLs (Auth settings). Document this as a manual Supabase step.
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **Logged-OUT surface** — unlike 15.5, this targets users with no session, so it lives on the public landing/recovery routes, not `/account`. [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-156-forgot--reset-password]
- **Supabase recovery flow:** `resetPasswordForEmail` emails a recovery link → the link opens the app with a recovery token that Supabase exchanges for a short-lived session → `updateUser({ password })` sets the new password. No custom token handling needed beyond reading the session on the reset page.
- **No account enumeration (AC3)** — the confirmation copy is identical whether or not the email exists; do not branch the UI on existence. [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-156-forgot--reset-password]
- **Open-redirect safety** — reuse the existing redirect guard when routing post-reset. [Source: utils/auth/redirect.ts]
- **No migration** — app-layer + a manual Supabase redirect-URL allowlist entry.

### Project Structure Notes

- Add `app/reset-password/page.tsx`; modify `app/page.tsx` (login form) to add the "Forgot password?" entry. Supabase client via `utils/supabase/client.ts`.

### References

- [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-156-forgot--reset-password]
- [Source: app/page.tsx]
- [Source: utils/auth/redirect.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
