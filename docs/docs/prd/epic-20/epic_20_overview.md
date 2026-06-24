# Epic 20: Pre-UAT UX Polish — Footer, Upload, Realtime

## Overview
One more round of UX cleanup before User Acceptance Testing. Four self-contained changes that make the everyday flows feel finished:

1. **The footer only exists on the login page.** The copyright + GitHub + help links (added with the login redesign) should appear on every page, and the "Help" link should read **"Getting Started"**.
2. **The upload dialog asks for a receipt name needlessly.** OCR already fills the name from the scan, so the staging dialog should drop the name field and instead capture **who paid**.
3. **The receipt "version history" is misleading.** The activity timeline (Epic 10) only shows the current session's actions — not prior sessions — so it reads as incomplete. Remove it from the receipt page.
4. **Only checkboxes update live.** The assignment matrix syncs in realtime (Epic 12), but the other editable fields don't — make **receipt name, paid by, tip, and tax** update live the same way.

No new product surface — this is polish on existing flows. No database changes expected.

## Target Approach & Technical Notes
* **Global footer (20.1):** the footer lives inline in `app/page.tsx` (≈ lines 211–234: `© 2026 PayUp` + a GitHub link + a "Help" link to `HELP.md`). Extract it into a shared `components/ui/Footer.tsx` and render it once in `app/layout.tsx` (after `{children}`, inside `<body>`) so it appears on every route; remove the inline copy from `page.tsx`. Rename the link text **"Help" → "Getting Started"** (target stays `HELP.md` — it's the getting-started guide). Mind the sticky-footer layout so it sits at the bottom on short pages without overlapping content.
* **Simplify the upload dialog (20.2):** the name input is in `ReceiptStagingModal` (opened from the trip page once `ReceiptUploadZone` returns an image URL; it already receives `participants`). Remove the **receipt-name** text box — the OCR pass populates `name` (Epic 13.4) — and replace it with a **"Paid by"** participant selector (a `<select>` over `participants`, defaulting sensibly). On insert, set `paid_by` from the selection; leave `name` for OCR to fill. Keep the existing quota/insert flow otherwise.
* **Remove version history (20.3):** drop `<ActivityTimeline>` from `ReceiptSplitView` and the now-unused audit-log read/state that feeds it. The `ActivityTimeline` component file can be deleted if nothing else imports it. **Scope decision:** this removes the *display* (and its read path); the Epic 10 audit-write backend can stay untouched (lowest-risk) — note any audit writes left dead so a follow-up can remove them if desired.
* **Realtime for editable fields (20.4):** `ReceiptSplitView` already subscribes to `receipt:${receiptId}` `postgres_changes` and applies **tax**, **tip**, `split_among`, and line items with an echo-guard + mid-edit debounce guard (LWW). The gap is the **receipt name** and **paid_by**, which the receipt detail page (`app/trips/[id]/receipts/[receiptId]/page.tsx`) owns and currently loads once. Extend realtime to those two — either lift them into the existing `ReceiptSplitView` channel or add a matching per-receipt subscription on the detail page — applying remote `name`/`paid_by` with the same echo-guard so a user's in-progress rename isn't clobbered. Verify all four (name, paid_by, tip, tax) sync across two clients. **Architecture note:** prefer one subscription per receipt to avoid duplicate channels; `receipts` is already in the Epic 12 realtime publication, so no migration.

## Epic Backlog Registry
* **Story 20.1:** Global Footer on Every Page ("Getting Started" link)
* **Story 20.2:** Simplify the Receipt Upload Dialog (drop name, ask who paid)
* **Story 20.3:** Remove the Receipt Version History
* **Story 20.4:** Realtime Sync for Name / Paid-By / Tip / Tax

**Sequencing note:** all four are independent and can proceed in any order. 20.1 and 20.3 are small/self-contained; 20.2 touches the staging modal; 20.4 is the most involved (extends the Epic 12 realtime path). No DB changes in any.

---

## Story 20.1: Global Footer on Every Page
**As a** user on any page,
**I want** the footer with copyright and links always visible,
**so that** the GitHub link and the getting-started guide are reachable everywhere.

### Acceptance Criteria
1. The footer (copyright, GitHub link, guide link) appears on **every** page, not just the login page.
2. The "Help" link text is changed to **"Getting Started"** (still links to the guide).
3. The footer is defined once (shared component in the layout), not duplicated per page; the inline copy is removed from the login page.
4. The footer sits at the bottom of the viewport on short pages and below the content on long pages — no overlap, light and dark themes intact.

## Story 20.2: Simplify the Receipt Upload Dialog
**As a** person adding a receipt,
**I want** the dialog to ask who paid instead of a name I don't need to type,
**so that** I'm not entering a name the scan will fill in anyway.

### Acceptance Criteria
1. The receipt-name text box is removed from the staging dialog.
2. The dialog asks **who paid** the bill — a selector over the trip's participants.
3. On create, the receipt's `paid_by` is set from the selection; the receipt `name` is left for OCR to populate (Epic 13.4).
4. The rest of the add-receipt flow (image, quota gate, insert, navigate to the receipt) is unchanged.
5. A receipt can still be renamed afterward on the receipt page (existing behavior).

## Story 20.3: Remove the Receipt Version History
**As a** user viewing a receipt,
**I want** the misleading session-only activity timeline gone,
**so that** the page doesn't imply a history it can't fully show.

### Acceptance Criteria
1. The activity timeline / version history no longer appears on the receipt page.
2. The component and its data plumbing on the receipt page are removed cleanly (no dead UI, no console errors).
3. No regression to the rest of the receipt page (matrix, fees, totals, realtime).
4. (Optional) Any audit-write code left with no remaining reader is noted for a possible follow-up cleanup.

## Story 20.4: Realtime Sync for Name / Paid-By / Tip / Tax
**As a** collaborator on a shared receipt,
**I want** edits to the name, payer, tip, and tax to appear live like the checkboxes,
**so that** everyone sees a consistent receipt without refreshing.

### Acceptance Criteria
1. Remote edits to **receipt name** and **paid_by** are reflected live for other viewers (matching the existing realtime checkboxes).
2. Remote edits to **tip** and **tax** are reflected live (confirm/retain the existing behavior).
3. Updates use an echo-guard so a user's own in-progress edit (e.g. mid-rename) isn't overwritten by the echo of their write (mirroring the existing fee/item guards).
4. No duplicate realtime channels per receipt; no migration (uses the Epic 12 `receipts` publication).
5. Verified across two clients for each of the four fields.
