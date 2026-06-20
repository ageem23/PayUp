---
baseline_commit: 00baaa9ae06b007357aada523f975e691ebe7b98
---

# Story 11.2: Redeem Magic Invite Link

Status: done

## Story

As a user who received a 'Magic Invite Link',
I want to click it, log in, and be auto-added as a member of that trip,
so that I can start collaborating without a manual invitation.

## Acceptance Criteria

1. A public route `/invite/[token]`.
2. Anonymous visitor → prompted to log in.
3. Logged-in visitor → automatically added as a member of the token's trip.
4. After joining → redirected to that Trip Detail page.
5. Invalid/disabled token → "Invalid Invite Link" error page.

## Tasks / Subtasks

- [x] **DB** — `supabase/migrations/0007_trip_members.sql`: `trip_members` table (`unique(trip_id,user_id)`, FK cascade) with RLS (read own rows only; **no INSERT policy** — members are added solely via the RPC); `is_trip_member()` `SECURITY DEFINER` helper (bypasses RLS → no policy recursion); `redeem_invite_token(token_input)` `SECURITY DEFINER` (auth guard, token lookup, `insert … on conflict do nothing`, returns trip id). **Feature 11.3 RLS:** member `select`/`update` policies on `trips` and a member `for all` policy on `receipts` (OR'd with the existing owner policies). Manual Supabase apply.
- [x] **Invite page** — `app/invite/[token]/page.tsx`: anonymous → `replace('/?redirect=/invite/<token>')` (AC2); logged-in → `rpc('redeem_invite_token')` once → `replace('/trips/<id>')` (AC3/AC4); error → "Invalid Invite Link" page (AC5).
- [x] **Login redirect** — `app/page.tsx`: `postLoginTarget()` honors a same-origin `?redirect` (rejects `//host`/absolute URLs — open-redirect guard); password login returns the user to the invite link.
- [x] **Member access (Feature 11.3)** — dropped the owner-only `user_id` filter on the trip-detail and dashboard `trips` queries so RLS returns owned **and** member trips; trip page already computes `isOwner` for the owner-only Share section.

## Dev Notes

### RLS recursion avoided
`trips`/`receipts` member policies call `is_trip_member()`, a `SECURITY DEFINER` function that reads `trip_members` with RLS bypassed — so there's no trips→trip_members→trips policy loop. `trip_members`'s own SELECT policy is the simple `user_id = auth.uid()`.

### Members added only via the RPC
`trip_members` has no INSERT/UPDATE/DELETE policy, so a client can't self-insert; the `SECURITY DEFINER` `redeem_invite_token` is the only path, and it stamps `auth.uid()` (can't add someone else). Disabled links (`invite_token = null`) never match a uuid token, so they can't be redeemed.

### OAuth redirect
The `?redirect` return-path works for the password flow. Google sign-in routes through `/auth/callback` → `/dashboard` (carrying state through OAuth is out of scope); the user can re-click the invite link once signed in.

### No tests
RPC/RLS + redirect UI — no pure unit-testable logic; RLS/RPCs can't run in CI (manual Supabase apply). "Tested" = lint + build clean (+ existing suite).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔ (`ƒ /invite/[token]`); `npm test` → 38 passed (8 suites).

### Completion Notes List

- **Manual deploy step:** apply `0007_trip_members.sql` in Supabase (table + RLS + RPCs) before redemption/member access work on the deployed app.
- Local self-review pass; BMAD adversarial review runs on the full epic diff before the PR, then CodeRabbit on the PR.

### File List

**Added:**
- `supabase/migrations/0007_trip_members.sql`
- `app/invite/[token]/page.tsx`

**Modified:**
- `app/page.tsx` (`postLoginTarget` redirect honoring + open-redirect guard)
- `app/trips/[id]/page.tsx` (drop owner-only filter — member access)
- `app/dashboard/page.tsx` (drop owner-only filter — show member trips)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-20 | 1.0.0 | trip_members table + member RLS (Feature 11.3) + redeem RPC; `/invite/[token]` redemption page with login-return redirect; member-visible trip/dashboard queries. Lint+build+test green. Merged into `epic-11`. | Amelia (Dev) |
