# Story 15.5: Change Email & Password

Status: ready-for-dev

## Story

As a user,
I want to change my email and password,
so that I can keep my login current and secure.

## Acceptance Criteria

1. From `/account`, the user can change their password via Supabase `updateUser()` on their own session.
2. The user can change their email; Supabase's confirmation-email flow is used, and the change applies per that flow.
3. Both actions give clear success/error feedback; failures (weak password, email already in use, etc.) are surfaced gracefully — never a raw error.
4. After a password change the session is not left in a broken state (remains valid or cleanly re-prompts per Supabase behavior).
5. Both actions operate only on the authenticated user's own account. (Re-authentication for these sensitive changes is a noted consideration — see Dev Notes.)

## Tasks / Subtasks

- [ ] **Change-password section on `/account`** (AC: 1, 3, 4) — new-password (+ confirm) inputs → `supabase.auth.updateUser({ password })`. Surface validation/errors (length, mismatch). Confirm the session stays usable afterward.
- [ ] **Change-email section on `/account`** (AC: 2, 3) — email input → `supabase.auth.updateUser({ email })`. Inform the user a confirmation link was sent to the **new** address and the change completes after they confirm (per Supabase project email settings).
- [ ] **Graceful errors** (AC: 3) — map Supabase auth errors to friendly messages (weak password, email already registered, rate limited).
- [ ] **Own-session only** (AC: 5) — both calls use the current user's client session; no admin/service-role path.
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **Pure Supabase Auth client calls** — `supabase.auth.updateUser(...)` on the user's own session; no migration, no server action. [Source: docs/docs/prd/epic-15/epic_15_overview.md#target-architecture-blueprint]
- **Email change is a two-step Supabase flow** — `updateUser({ email })` triggers a confirmation to the new address; the email doesn't change until confirmed. Behavior depends on the project's Auth email settings (confirm-email enabled). Set expectations in the UI accordingly.
- **Re-auth consideration (AC5):** Supabase allows password change on a valid session without the current password. If you want a stronger bar for these sensitive actions (e.g. require re-entering the current password / recent login), decide it here — it's a small UX addition, not a blocker. Flagged from the overview's architecture note. [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-155-change-email--password]
- **Account deletion is NOT part of this** — it's deferred (needs service-role + the owned-shared-trip decision). Don't add a delete affordance here. [Source: docs/docs/prd/epic-15/epic_15_overview.md#out-of-scope-candidate-follow-ons]

### Project Structure Notes

- Extend `app/account/page.tsx` with the two sections. Auth calls via the existing Supabase client (`utils/supabase/client.ts`).

### References

- [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-155-change-email--password]
- [Source: context/AuthContext.tsx]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
