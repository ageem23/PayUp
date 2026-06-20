---
baseline_commit: 26ca1196da4e30bf3f36773f625ecdbbdfba33a7
---

# Story 11.1: Generate and Manage Invite Links

Status: done

## Story

As a trip owner,
I want to generate a unique 'Magic Invite Link' for my trip and manage its status,
so that I can easily and securely share editing access.

## Acceptance Criteria

1. A "Share" section is visible only to the trip owner on the Trip Detail page.
2. It contains a "Generate Invite Link" button.
3. Clicking generates a unique, shareable link and displays it.
4. The owner can copy the link to the clipboard.
5. The owner can disable the link, which invalidates it.

## Tasks / Subtasks

- [x] **Token RPCs** — `supabase/migrations/0006_invite_token_rpcs.sql`: `generate_invite_token(trip_id_input)` and `disable_invite_token(trip_id_input)`, both `SECURITY DEFINER` with `set search_path = public` and an owner check (`auth.uid() = trips.user_id`). `trips.invite_token` already existed (0002). Execute granted to `authenticated`, revoked from `anon`. **Manual deploy** (Supabase SQL editor).
- [x] **Share UI** — `components/feature/InviteLinkManager.tsx`: owner-only panel. Generate → `supabase.rpc('generate_invite_token')` → shows `${origin}/invite/${token}`; Copy (clipboard, with manual-copy fallback); Disable → `supabase.rpc('disable_invite_token')` → clears the link.
- [x] **Wire** — `app/trips/[id]/page.tsx`: selects `user_id,invite_token`; computes `isOwner`; renders `<InviteLinkManager>` only for the owner.

## Dev Notes

### Why RPCs instead of a direct UPDATE
Minting/revoking the token is owner-only, but a member will (Story 11.2) have UPDATE on the trip via RLS. `SECURITY DEFINER` functions with an explicit owner check keep token control with the owner regardless of the row-level UPDATE grant, and centralize the check in the DB (not just the UI). `set search_path = public` blocks search-path hijacking of the definer context.

### Token column
`trips.invite_token uuid unique` was added anticipatively in 0002, so this story only adds the RPCs.

### Split with 11.2
This story mints/manages links. The `trip_members` table, the `redeem_invite_token` RPC, the member-access RLS (Feature 11.3), and the `/invite/[token]` page land in Story 11.2.

### No tests
RPC-calling UI + SQL — no pure unit-testable logic. "Tested" = lint + build clean (+ existing suite). The RPCs can't run in CI (manual Supabase apply).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔; `npm test` → 38 passed (8 suites, unchanged).

### Completion Notes List

- **Manual deploy step:** apply `0006_invite_token_rpcs.sql` in Supabase before the Share buttons work on the deployed app.
- Local self-review pass; BMAD adversarial review runs on the full epic diff before the PR, then CodeRabbit on the PR.

### File List

**Added:**
- `supabase/migrations/0006_invite_token_rpcs.sql`
- `components/feature/InviteLinkManager.tsx`

**Modified:**
- `app/trips/[id]/page.tsx` (select user_id/invite_token; owner-only Share section)

## Review Findings

_From `bmad-code-review` (adversarial; security-focused) on `main...epic-11`, 2026-06-20._

- [x] [Review][Patch] Invite token leaked to members via the trip payload [supabase/migrations/0006_invite_token_rpcs.sql, components/feature/InviteLinkManager.tsx, app/trips/[id]/page.tsx] — **FIXED (HIGH):** the trip query selected `invite_token`, and members can read the trips row (RLS can't column-mask) — so any member could read the token and re-share access. Added an owner-only `get_invite_token` SECURITY DEFINER RPC; `InviteLinkManager` fetches the token itself (it only renders for the owner), and `invite_token` was removed from the page query entirely.
- [x] [Review][Patch] Share copy overstated who can join [components/feature/InviteLinkManager.tsx] — **FIXED (LOW):** reworded to "Anyone allow-listed…" since redemption requires a whitelisted login.

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-20 | 1.0.0 | Owner-only Share panel + `generate`/`disable` invite-token SECURITY DEFINER RPCs. Lint+build+test green. Merged into `epic-11`. | Amelia (Dev) |
