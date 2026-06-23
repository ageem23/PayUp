# Epic 15: Your Account — Profiles & Self-Service Management

## Overview
Epic 14 opened PayUp to the public (anyone can sign up; the whitelist became an "unlimited" tier). But the account experience never caught up: there is **no logout button anywhere in the UI**, no way to change your email or password, no "forgot password" flow, and no real profile — a user is identified only by their email, and the sole "preference" (accent color) lives in `localStorage`, so it's lost on a new device.

The goal of Epic 15 is to give every user a real, self-managed account: a **DB-backed profile** (display name, avatar, and preferences that follow them across devices) and the **everyday self-service controls** they expect (log out, change email/password, recover a forgotten password). It is deliberately the *user-facing* half of user management — admin tooling (approving access requests, managing the whitelist, suspending users) and account deletion are scoped to a later epic.

Everything in this epic operates on the **authenticated user's own identity** via their own session and RLS — no service-role/admin path is needed, which keeps the epic self-contained and low-risk.

## Target Architecture Blueprint
* **Profiles table:** New `public.profiles`, 1:1 with `auth.users` (`user_id` PK/FK). A row is auto-created for every new user via a trigger on `auth.users` insert, plus a one-time backfill for existing users. RLS: a user reads/updates **their own** profile. The schema is designed to permit a future co-member read policy (for showing names on shared trips) without restructuring — but that policy is **not** enabled here.
* **Account shell:** A new authenticated route (`/account`) is the home for profile editing and the email/password controls; an account menu entry point (with the user's avatar/name) is added to the authenticated header/dashboard and carries the **logout** action.
* **Avatar storage:** A dedicated `avatars` storage bucket with per-user write policies, mirroring the `receipt-images` validation pattern (type/size); `profiles.avatar_url` references the object.
* **Preferences:** `theme` and `accent_color` move onto `profiles`. `localStorage` is retained as a pre-hydration cache so there's no theme flash, but the DB is the source of truth that syncs across devices. This swaps the persistence layer beneath the existing Epic 9 `ProfileSelector` UX — not the UX itself.
* **Auth self-service:** Email and password changes use Supabase `updateUser()` on the user's own session (email change goes through Supabase's confirmation-email flow). Forgot-password uses `resetPasswordForEmail()` plus a public recovery page that consumes the Supabase recovery token.
* **No service role this epic:** because account deletion is deferred, every operation is client + RLS; no Edge Function or service-role key is introduced.

## Epic Backlog Registry
* **Story 15.1:** Account Menu & Logout
* **Story 15.2:** Profiles Table & Display Name
* **Story 15.3:** Profile Avatar
* **Story 15.4:** Preferences That Follow the User (theme & accent → DB)
* **Story 15.5:** Change Email & Password
* **Story 15.6:** Forgot / Reset Password

**Sequencing note:** 15.1 ships the account shell + logout (immediate value, and a home for everything after it). 15.2 lays the `profiles` foundation that 15.3 (avatar) and 15.4 (preferences) build on. 15.5 and 15.6 are auth-self-service and depend only on the account shell (15.1) and Supabase Auth — they can proceed in parallel with the profile stories.

---

## Story 15.1: Account Menu & Logout
**As a** signed-in user,
**I want** an account menu with a working log-out button,
**so that** I can sign out and reach my account settings.

### Acceptance Criteria
1. A persistent account entry point (e.g., an avatar/name menu in the authenticated header or dashboard) is available across authenticated pages.
2. It includes a **Log out** action that calls the existing `signOut()` and returns the user to the landing/login page with no lingering session.
3. From the menu, the user can navigate to an account settings page (`/account`) — the shell that hosts Stories 15.2–15.5.
4. The entry point is shown only to authenticated users; signed-out users never see it.
5. No regression to existing navigation or page layouts.

## Story 15.2: Profiles Table & Display Name
**As a** user,
**I want** a display name,
**so that** I'm identified by something friendlier than my email address.

### Acceptance Criteria
1. A `public.profiles` table exists, 1:1 with `auth.users` (`user_id` primary key referencing `auth.users(id)`), including at least `display_name`.
2. A profile row is auto-created for every user — a trigger creates one on new `auth.users` insert, and existing users are backfilled.
3. RLS allows a user to read and update **only their own** profile (the table is designed so a co-member read policy could be added later without rework).
4. The `/account` page lets the user view and edit their display name, and the change persists.
5. The display name is shown where the user sees their own identity (e.g., the account menu); when unset/blank it falls back to the email.
6. Display names are validated (trimmed, sane max length, blank → fallback) — no broken or empty-string identities.

## Story 15.3: Profile Avatar
**As a** user,
**I want** a profile picture,
**so that** my account feels personal and recognizable.

### Acceptance Criteria
1. From `/account`, the user can upload an avatar image; it is stored in a dedicated `avatars` bucket with the same format/size validation rigor as receipt images.
2. `profiles.avatar_url` references the stored image; a storage policy lets a user write/replace **only their own** avatar.
3. The avatar is displayed in the account menu and anywhere the user's own identity is shown.
4. A sensible placeholder/default is shown when no avatar is set.
5. Replacing an avatar overwrites or cleans up the prior object so avatars don't accumulate unbounded orphans.

## Story 15.4: Preferences That Follow the User
**As a** user who switches devices,
**I want** my theme and accent color saved to my account,
**so that** I don't have to reconfigure them everywhere.

### Acceptance Criteria
1. Theme (dark/light) and accent color persist to the user's `profiles` row, not only `localStorage`.
2. On load, the persisted preference hydrates the UI; `localStorage` remains a pre-hydration cache so there is no theme flash.
3. Changing a preference updates the DB (and the cache); the change is reflected in another session/device after refresh.
4. Signed-out users (and users with no profile yet) still get sensible defaults with no errors.
5. The existing Epic 9 `ProfileSelector` UX (color choices + theme toggle) is preserved — only the persistence layer changes.

## Story 15.5: Change Email & Password
**As a** user,
**I want** to change my email and password,
**so that** I can keep my login current and secure.

### Acceptance Criteria
1. From `/account`, the user can change their password via Supabase `updateUser()` on their own session.
2. The user can change their email; Supabase's confirmation-email flow is used, and the change applies per that flow.
3. Both actions give clear success/error feedback; failures (weak password, email already in use, etc.) are surfaced gracefully — never a raw error.
4. After a password change the session is not left in a broken state (remains valid or cleanly re-prompts per Supabase behavior).
5. Both actions operate only on the authenticated user's own account. (Re-authentication for these sensitive changes is a noted consideration for the architecture step.)

## Story 15.6: Forgot / Reset Password
**As a** user who forgot my password,
**I want** to reset it via an email link,
**so that** I can regain access to my account.

### Acceptance Criteria
1. The login/landing page offers a "Forgot password?" entry that collects an email and calls `resetPasswordForEmail()`.
2. A public recovery page consumes the Supabase recovery token and lets the user set a new password.
3. The confirmation message is shown regardless of whether the email belongs to an account (no account enumeration).
4. After a successful reset, the user can sign in with (or is signed in via) the new password.
5. Expired or invalid recovery links show a clear message and a path to request a new one.

---

## Out of Scope (candidate follow-ons)
* **Delete my account** — deferred: needs a product decision on what happens to owned trips that have other members, plus a service-role server action to remove the `auth.users` row and cascade cleanup.
* **Admin & trust tooling** (future epic): in-app review/approve/deny of `access_requests`, managing `allowed_users`, a user list, and suspend/ban — including defining an admin role (none exists today).
* **Email verification** on signup (and re-send confirmation).
* **Co-member identity:** showing other members' display names/avatars on a shared trip, a trip member list, or removing members.
* **2FA / MFA** and additional OAuth providers.

## Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-22 | 1.0.0 | Initial Epic 15 definition: DB-backed profiles (display name, avatar, cross-device preferences) and self-service account controls (account menu + logout, change email/password, forgot/reset password). Account deletion and admin tooling deferred to follow-on epics. | John (PM) |
