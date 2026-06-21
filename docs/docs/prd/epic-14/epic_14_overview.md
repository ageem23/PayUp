# Epic 14: Open Access & the Metered Free Tier

## Overview
Today PayUp's whitelist is the *authentication gate*: if your email isn't in `allowed_users`, you cannot sign in, hold a session, view a trip, or participate at all — `applySession()` signs you straight out. That makes the product strictly invite-only and caps its reach at the whitelist.

The goal of Epic 14 is to convert the whitelist from an **authentication wall** into a **usage tier** so PayUp can grow past its invite list. Anyone can sign up. If your email is in `allowed_users` you remain **unlimited**. If it isn't, you're on the **free tier**: you get the full app — create trips, join trips, split bills — with exactly one restriction: you can create at most **3 receipts per rolling 7-day window**. When you hit that cap, you're hard-blocked on the next receipt with a clear message and a nudge to request unlimited access. (Trips are cheap; receipts carry the OCR cost, so the receipt count is the only metered resource.)

The defining constraint of this epic: the quota is a security/cost boundary, so it is **enforced server-side and authoritatively** (database layer). UI affordances — counters, disabled buttons, hidden controls — are convenience only and are never the thing that actually stops a write.

## Target Architecture Blueprint
* **Whitelist → Tier:** `public.allowed_users` is reused unchanged, but its *meaning* flips from "may authenticate" to "is unlimited." A new `SECURITY DEFINER` helper `public.is_unlimited_user()` (mirroring the existing `public.is_trip_member()`) becomes the single source of truth for tier, so enforcement never depends on the calling user's own read access to `allowed_users`. **Note:** the deployed `allowed_users` carries a manual public-read RLS policy not present in repo migrations (known repo↔DB drift) — the architecture work must reconcile this rather than assume the repo state.
* **Receipt Attribution:** `public.receipts` gains a `created_by uuid` column (FK → `auth.users.id`), populated on every insert and backfilled best-effort for existing rows (to the parent trip's owner, else `null`). Without it there is no way to count receipts per user.
* **Quota Enforcement:** A database-level guard (trigger / RLS `with check` / RPC) on `receipts` insert rejects the write when the creator is **not** an unlimited user **and** already has **≥ 2** receipts whose `created_by` is them and whose `created_at` falls within the trailing **7 days**. Whitelisted users are exempt. Enforcement is atomic enough to survive concurrent inserts racing the cap.
* **Gate Removal:** `context/AuthContext.tsx` (`applySession`, `signIn`, `signUp`, `signInWithGoogle`) and `app/auth/callback/page.tsx` stop signing out / rejecting non-whitelisted users. A held session no longer implies whitelist membership. The legacy `/unauthorized` hard-reject screen is retired or repurposed, since whitelist-miss is no longer a rejection.
* **Trips are NOT gated:** Free-tier users create trips with no restriction (superseded decision — see Change Log). The receipt quota is the sole free-tier limit.
* **Quota Surfacing:** The receipt add path reads remaining allowance (via a read-only helper/count) to show "N of 3 left this week, resets <when>"; the limit-reached state presents a hard block plus a "get unlimited access" call-to-action.
* **Upgrade Path:** A lightweight request mechanism lets a free-tier user ask to be whitelisted (a recorded request / notification an admin can act on), making the nudge actionable without building self-serve provisioning or payments.

## Epic Backlog Registry
* **Story 14.1:** Receipt Authorship Attribution (`created_by`)
* **Story 14.2:** Server-Enforced Weekly Receipt Quota (Free Tier)
* **Story 14.3:** Open Signup — Whitelist Becomes a Tier, Not an Auth Wall
* **Story 14.4:** Quota Visibility & Limit-Reached Block
* **Story 14.5:** Request Unlimited Access

> **Superseded:** a "Block Trip Creation for Free-Tier Users" story (former 14.4) was removed by the 2026-06-21 product decision — non-whitelisted users may create trips freely; the receipt cap is the only free-tier restriction. Former stories 14.5/14.6 were renumbered to 14.4/14.5.

**Sequencing note:** 14.1 → 14.2 build attribution and the *dormant* meter while the gate is still closed (no live free-tier users yet), so the quota is provable in isolation. Only then does 14.3 open the gate — the cap is already live the moment anyone non-whitelisted can log in, leaving no window of unmetered free-tier access. 14.4–14.5 refine UX on top of a working meter.

---

## Story 14.1: Receipt Authorship Attribution (`created_by`)
**As a** system enforcing per-user limits,
**I want** every receipt to record which user created it,
**so that** receipts can be counted per user — the prerequisite for any quota.

### Acceptance Criteria
1. The `receipts` table gains a `created_by uuid` column referencing `auth.users.id` (nullable to tolerate legacy/backfill rows).
2. Every new receipt insert (from the existing staging flow and any other path) populates `created_by` with the authenticated user who created it.
3. Existing receipt rows are backfilled best-effort: `created_by` is set to the parent trip's owner (`trips.user_id`) where determinable, otherwise left `null`.
4. No user-visible behavior changes — receipt creation, OCR, splitting, and totals are unaffected.
5. RLS continues to allow trip owners and approved members to create receipts; the new column does not tighten or loosen who may write.

## Story 14.2: Server-Enforced Weekly Receipt Quota (Free Tier)
**As a** product owner protecting OCR cost and the value of the unlimited tier,
**I want** non-whitelisted users limited to 3 receipts per rolling 7 days, enforced in the database,
**so that** the cap cannot be bypassed by calling the API directly.

### Acceptance Criteria
1. A `SECURITY DEFINER` helper `public.is_unlimited_user()` returns true when the current user's email is present in `allowed_users`, and is the single source of truth for tier.
2. A receipt insert is **rejected server-side** when the creator is **not** an unlimited user **and** already has **3 or more** receipts with `created_by` = them and `created_at` within the trailing 7 days (rolling window from the moment of insert).
3. Unlimited (whitelisted) users are never limited — their receipt creation is unaffected.
4. Enforcement lives at the database layer (trigger / RLS `with check` / RPC), **not** in client code; bypassing the UI does not bypass the cap.
5. Two near-simultaneous inserts cannot both slip past the limit (the count-and-block is atomic / serialized so the cap holds under concurrency).
6. A rejected insert surfaces a distinguishable error (not a generic failure) that the UI can map to the limit-reached state in 14.5.
7. The window counts only the creating user's own receipts across all trips — not receipts others added to the same trip.

## Story 14.3: Open Signup — Whitelist Becomes a Tier, Not an Auth Wall
**As a** new user who isn't on the invite list,
**I want** to sign up and use PayUp,
**so that** I can join a friend's trip and split a bill without needing to be pre-approved.

### Acceptance Criteria
1. A non-whitelisted user can complete sign-up (email/password and Google OAuth) and is **not** signed out or redirected to a rejection screen.
2. `applySession`, `signIn`, `signUp`, and the OAuth callback no longer treat a whitelist miss as a reason to reject the session; a held session no longer implies whitelist membership.
3. After signing in, a non-whitelisted user reaches the authenticated app (dashboard) and can view/join trips per existing RLS.
4. Whitelisted users' authentication experience is unchanged (still reach the app, still unlimited).
5. The legacy `/unauthorized` hard-reject path is retired or repurposed so that a normal non-whitelisted user is never dead-ended there.
6. The free-tier user is subject to the 14.2 quota immediately upon gaining access — there is no interval in which they can add receipts without the cap applying.

## Story 14.4: Quota Visibility & Limit-Reached Block
**As a** free-tier user adding receipts,
**I want** to see how many receipts I have left and a clear message when I run out,
**so that** the limit never feels like a broken app.

### Acceptance Criteria
1. On the receipt add path, free-tier users see their remaining allowance for the current rolling window (e.g. "2 of 3 receipts left this week") and when it resets.
2. When the limit is reached, attempting to add a receipt is hard-blocked with a clear, friendly message stating the cap and the reset timing — mapped from the 14.2 server error, not a guess.
3. The limit-reached state includes a "get unlimited access" call-to-action that leads into the 14.5 request flow.
4. Unlimited users see no counter and no cap messaging.
5. The displayed count is consistent with the server's authoritative count (the UI may pre-check to avoid a wasted upload, but the server remains the source of truth; a UI/server disagreement fails safe by deferring to the server).
6. Where feasible, the UI prevents a doomed image upload (pre-check) so a blocked attempt does not orphan an image in the `receipt-images` bucket.

## Story 14.5: Request Unlimited Access
**As a** free-tier user who's hit the receipt cap,
**I want** to request unlimited access,
**so that** an admin can whitelist me without me hunting for a contact channel.

### Acceptance Criteria
1. From the upgrade CTA in the limit-reached block (14.4), a free-tier user can submit a request for unlimited access in-app.
2. The request is recorded/notified so an admin can see who asked and act on it (e.g. add them to `allowed_users`); the exact admin tooling can be minimal.
3. The user receives clear confirmation that their request was submitted and what to expect next.
4. Submitting a request does not itself grant access — whitelisting remains an explicit admin action.
5. Duplicate/repeat requests from the same user are handled gracefully (no errors, no spam state).

---

## Out of Scope (candidate follow-ons, Epic 14.7+)
* Self-serve or automated whitelisting and any form of payment/billing for the unlimited tier.
* An admin dashboard for reviewing and approving access requests (14.5 records the request; rich admin UX is later).
* Configurable or per-user custom limits (the 3-per-7-day cap is a fixed constant for this epic — env/runtime configurability was evaluated and dropped, see architecture §8).
* Metering anything other than receipt creation (e.g. trips, OCR re-runs, storage).
* Cleanup of images already uploaded before a server-side block (mitigated by the 14.4 pre-check, but no dedicated reconciliation job here).
* Email/push notifications to admins on new access requests (in-app/record-only is sufficient for MVP).

## Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Initial Epic 14 definition: convert whitelist from auth gate to usage tier — open signup, server-enforced 2-receipts/rolling-7-day free-tier quota, free-tier trip-creation block, quota visibility + limit-reached block, and a request-unlimited-access path. | John (PM) |
| 2026-06-21 | 1.1.0 | Product decision: **removed the free-tier trip-creation block** — non-whitelisted users may create trips freely; the 2-receipt/rolling-7-day cap is the sole free-tier restriction. Dropped former Story 14.4; renumbered former 14.5/14.6 → 14.4/14.5. Epic is now 5 stories. | John (PM) |
| 2026-06-21 | 1.2.0 | Raised the free-tier cap **2 → 3 receipts** per rolling 7 days. Env-configurability evaluated and dropped (DB-trigger can't read `.env`); cap stays a hardcoded constant. | John (PM) |
