# Epic 17: Pre-UAT Polish — Trips, Participants & Layout

## Overview
With the platform work done (open access, accounts, security), a handful of everyday-usability gaps remain that would make User Acceptance Testing rough. This epic closes them so the core "set up a trip → add people → split → settle" loop feels finished:

1. **You can't tell whose trip is whose.** The dashboard lists trips you own and trips shared with you identically — there's no indication a trip was created by someone else, or by whom.
2. **Trips never "finish."** There's no way to mark a trip done or get it out of the active list, so the dashboard only grows.
3. **Adding people is tedious.** Participants are added one at a time at trip creation.
4. **The participant list is frozen after creation.** You can't see or change a trip's participants once it exists.
5. **Receipt layout is inconsistent.** Mobile shows image → participant checkboxes → fees; desktop uses a different two-column arrangement.

The goal of Epic 17 is to make trips legible (who owns them, which are done), make people-management fast and flexible (bulk add, in-trip edit), and make the receipt view consistent across breakpoints — the last polish before UAT.

## Target Approach & Technical Notes
* **Trip ownership identity (17.1):** the dashboard already shows owned + member trips; we add the **owner's identity** (display name / avatar from `profiles`). This requires a **co-member profile read** — Epic 15 made `profiles` self-only, so we add a narrowly-scoped read path (a `SECURITY DEFINER` helper or an RLS policy) that lets a user read the profile of someone they **share a trip with**, without exposing profiles broadly. Mind RLS recursion between `profiles` ↔ `trips`/`trip_members`.
* **Completion via `is_settled` (17.2):** per product decision we **reuse the existing `trips.is_settled` boolean** as the "completed" flag — no migration. The dashboard filters it out by default and a toggle reveals completed trips. Toggling completion is an owner action (existing owner-only `trips` UPDATE RLS).
* **Bulk participant entry (17.3):** client-side only — the new-trip form splits the participant input on **whitespace**, trims, de-duplicates, and shows the parsed names as editable chips so the user can fix any over-split (a multi-word name like "Mary Anne" becomes two entries by design; the editable chips let them correct it).
* **In-trip participant management (17.4):** read/write `trips.participants` (the JSONB name array) from the trip page. **Removal is blocked** when the participant is referenced by any receipt (`paid_by` or in any `split_among`) — the user is told to reassign first. Because participants are collaborative, owner **and** approved members should be able to edit them; since `trips` UPDATE is owner-only today, this needs a member-capable path — a column-scoped policy or a `SECURITY DEFINER` RPC (architecture decision).
* **Consistent receipt layout (17.5):** the receipt split view drops the desktop `lg:` two-column layout and **stacks vertically — image → assignment matrix → fees/total — on all breakpoints**, matching mobile. Purely presentational; no change to assignment, fees, or totals.
* **Quantity auto-split (17.6):** extend the Gemini OCR structured schema with a `quantity` field (taken **only from a leading number in the first column**) and prompt it to return the line's **extended (total) price**; then **expand lines whose quantity is a whole number ≥ 2 deterministically in code** into that many items at `total ÷ quantity`, distributing the leftover cent so the sum exactly equals the original line total. **Fractional/measure quantities (½, 0.5, 1.5) and quantity ≤ 1 are never split** — partial items can't become assignable units. Two invariants: *total preservation* (naively duplicating the printed price doubles the bill when that price is the line total) and *no undercount* (when unsure, don't split). Downstream (assignment matrix, splitting, fee math) needs no change — it's just more line items. Scope is essentially `app/api/ocr/route.ts` + the mock-OCR fixture + tests.
* **Next migration number is `0015`** (head: `0014_profile_preferences.sql`). 17.1 (and possibly 17.4) introduce migrations — coordinate numbering with any parallel session.

## Epic Backlog Registry
* **Story 17.1:** Show Who Created Each Trip
* **Story 17.2:** Mark a Trip Completed + Dashboard Toggle
* **Story 17.3:** Quick Multi-Participant Entry (space-separated)
* **Story 17.4:** Manage Participants Within a Trip
* **Story 17.5:** Consistent Receipt Layout (Image → Matrix → Fees, all breakpoints)
* **Story 17.6:** Auto-Split Quantity Line Items

**Sequencing note:** 17.1 carries the only non-trivial backend piece (the co-member profile read) and unblocks showing identity anywhere. 17.2–17.4 are independent trip/participant improvements. 17.5 is a self-contained layout change, and 17.6 is a self-contained OCR-pipeline change. They can largely proceed in parallel.

---

## Story 17.1: Show Who Created Each Trip
**As a** user who belongs to trips created by others,
**I want** the dashboard to show who created each trip,
**so that** I can tell my own trips apart from ones shared with me.

### Acceptance Criteria
1. Each trip in the dashboard list shows its creator (owner's display name, falling back to email/initial when no display name is set).
2. Trips the current user created are visually distinguished from trips shared with them (e.g., an "owned by you" treatment vs. "shared by <name>").
3. The creator's identity is resolved through a profile read that respects privacy: a user may read the profile (display name / avatar) of users they **share a trip with**; profiles of unrelated users stay private.
4. Which trips a user can see is unchanged (owner + member visibility per existing RLS).
5. Works when the creator has no profile/display name yet (graceful fallback, no blank or error).

## Story 17.2: Mark a Trip Completed + Dashboard Toggle
**As a** trip owner,
**I want** to mark a trip completed and keep finished trips out of my active list,
**so that** my dashboard shows what's still in progress.

### Acceptance Criteria
1. The owner can mark a trip **completed** and un-mark it, persisted via the existing `trips.is_settled` flag.
2. The dashboard **hides completed trips by default**.
3. A toggle on the dashboard reveals completed trips alongside (or in place of) active ones.
4. When shown, completed trips are visually labeled as completed.
5. Only the trip owner can change completion state (existing owner-only `trips` UPDATE RLS); members see the state but don't toggle it.
6. No change to settle-up math — `is_settled` here means "the user marked this trip done."

## Story 17.3: Quick Multi-Participant Entry
**As a** person setting up a trip,
**I want** to add several participants at once by typing names separated by spaces,
**so that** I don't have to add them one at a time.

### Acceptance Criteria
1. On trip creation, entering space-separated text adds **each token as a separate participant**.
2. Extra/leading/trailing whitespace is ignored; empty tokens are skipped; duplicates are de-duplicated.
3. Parsed participants are shown as editable items (chips/list) **before** the trip is created, so the user can remove or correct any entry.
4. A multi-word name splits into multiple entries by design; because the parsed result is visible and editable, the user can fix it (e.g., delete the extra and rename).
5. The created trip's `participants` array contains exactly the reviewed set.

## Story 17.4: Manage Participants Within a Trip
**As a** trip participant,
**I want** to see and edit a trip's participant list after it's created,
**so that** I can add someone who was missed or remove someone added by mistake.

### Acceptance Criteria
1. The trip page shows the trip's current participant list.
2. A participant can be **added** to the trip; it persists to `trips.participants` and appears in the receipt assignment UI.
3. A participant can be **removed** — but removal is **blocked with a clear explanation** when that participant is referenced by any receipt (as `paid_by` or within any `split_among`); the user is directed to reassign those first.
4. Adds/removes persist server-side and respect access control: the trip owner and approved members may manage participants; non-members cannot.
5. Changes are reflected in the receipt assignment matrix and, where applicable, broadcast to other clients via the Epic 12 realtime channel.
6. Duplicate participant names are prevented.

## Story 17.5: Consistent Receipt Layout
**As a** user splitting a receipt,
**I want** the receipt view ordered the same way on desktop and mobile — image, then participant checkboxes, then fees,
**so that** the experience is consistent across devices.

### Acceptance Criteria
1. On **desktop**, the receipt split view stacks vertically in this order: receipt **image** → participant **assignment matrix** → **fees/total** summary.
2. The previous desktop two-column (`lg:`) arrangement is removed in favor of the single stacked order.
3. Mobile ordering is unchanged (already image → matrix → fees).
4. Purely a presentational reorder — assignment, per-participant shares, proportional fees, and totals are functionally unchanged.
5. Verified at both mobile and desktop breakpoints.

## Story 17.6: Auto-Split Quantity Line Items
**As a** user splitting a receipt that has multi-quantity items,
**I want** each quantity expanded into separate line items,
**so that** I can assign individual units to different people.

### Acceptance Criteria
1. The Gemini OCR structured schema captures a `quantity` per line item, and the prompt instructs the model to take quantity **only from a leading number in the first (quantity) column** and to report `price` as the line's **extended (total) price**. No first-column number → quantity 1.
2. A line is expanded **server-side, in code** (not by the model emitting duplicate lines) **only when its quantity is a whole number ≥ 2** — into that many separate items.
3. **Fractional / non-integer quantities** (e.g., 0.5, 1.5 — weight- or measure-priced items) and quantity ≤ 1 are **not** split; the line stays a single item at its full line total.
4. For an integer split, each expanded item's price = line total ÷ quantity, with the **leftover cent distributed** so the items' sum exactly equals the original line total.
5. **Value-preserving:** processing never reduces the total — items' sum afterward equals the sum before, and receipt-total reconciliation (sum of items vs `total`) is preserved. When quantity is absent, non-numeric, or fractional, **do not split** rather than risk an undercount.
6. Expanded items get distinct ids (independent assignment in the matrix) and sensible names (item name without a quantity prefix).
7. Tests cover even (2 @ $6.00) and uneven (3 @ $10.00 → 3.34/3.33/3.33) splits, fractional (0.5, 1.5 → unchanged), quantity 1 / missing / non-numeric (unchanged), and the value-preserving invariant.

---

## Out of Scope (candidate follow-ons)
* **Auth-level membership management** — adding/removing the actual `trip_members` (invited accounts) or showing a co-member roster beyond the `participants` name labels. (17.4 manages the `participants` JSONB labels used for splitting, not auth memberships.)
* **Reassignment tooling** for the 17.4 block — auto-migrating a removed participant's splits/payer to someone else (we block and let the user reassign manually).
* **Per-trip archival/delete** beyond the completed toggle.
* **Delete my account**, admin tooling, and email verification — separate deferred items, not part of this pre-UAT polish.

## Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-23 | 1.0.0 | Initial Epic 17 definition: trip creator visibility (co-member profile read), mark-completed via `is_settled` + dashboard toggle, space-separated bulk participant entry, in-trip participant add/remove (block when referenced), and a consistent single-column receipt layout (image → matrix → fees) across breakpoints. | John (PM) |
| 2026-06-23 | 1.1.0 | Added Story 17.6: auto-split quantity line items in the OCR pipeline (extract `quantity` + extended price, expand in code with cent-accurate total preservation). | John (PM) |
