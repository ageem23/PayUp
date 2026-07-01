# Epic 22: UX Polish — Feedback Round 1

## Overview
PayUp's core flows (auth, trips, receipt scanning, splitting, settle-up) are in place, and real usage has surfaced a set of small but repeated user-experience rough edges. None of these change behavior or data — they're layout, discoverability, and information-hierarchy fixes that make the app feel finished. This epic batches the first round of that feedback into one coherent pass.

The theme is **polish, not new capability**: align the login logo to the card it sits above, make the footer's GitHub links obviously clickable, brand the dashboard, consolidate the "appearance" controls (theme + badge color) into one place instead of floating/scattered, and reorder the trip page so the thing people came to do (see and add receipts) is at the top.

**Scope (from user feedback):**
- **Trim** the **login-page logo** (crop the banner's surrounding whitespace **in CSS**, reusing the one `/banner.png` asset) and constrain it to the login-card width (384px / `max-w-sm`), still centered.
- Make the **GitHub links in the footer** ("GitHub" and "Getting Started") persistently underlined on every page, not underline-on-hover.
- Add the **full-width PayUp banner** to the dashboard, beneath the "Your trips" / "Create New Trip" row.
- Move the **light/dark mode toggle** and the **profile badge color** control off the floating button / dashboard and **into the account (profile) page**.
- **Reorder the trip-details sections** to: Receipts list → Add a receipt → Participants → Settle up → Share.

**Out of scope (deferred):** new appearance options (fonts, more accent colors), a redesigned nav/header, mobile-specific redesigns, and any change to how theme/accent are persisted or synced (the existing context providers are reused untouched).

## Target Approach & Technical Notes
* **No data model, migration, or API changes.** Every story is presentational — JSX/Tailwind edits and small component moves. The theme (`context/ThemeContext.tsx`) and accent (`context/AccentColorContext.tsx`) providers, their hooks (`useTheme`, `useAccentColor`), and their localStorage + DB-sync behavior are **reused as-is**; only the *placement* of the controls changes.
* **Login logo (22.1).** [app/page.tsx](app/page.tsx) lines 80–89 render `/banner.png` in a `max-w-xl` (512px) wrapper above a `max-w-sm` (384px) login card (line 91). Two changes: **trim the banner's surrounding whitespace in CSS** (reusing the single `/banner.png` — no second cropped file) and constrain the result to the card width (`max-w-sm`, 384px, still centered). Do the crop with CSS only — an `overflow-hidden` container plus `object-cover` + `object-position` (or an `aspect-ratio` wrapper) so only the wordmark shows and nothing is distorted. **Factor this into a small shared `BannerLogo` component** so the login page and the dashboard (22.3) use one asset + one crop treatment.
* **Footer links (22.2).** [components/ui/Footer.tsx](components/ui/Footer.tsx) — the "GitHub" (lines 9–16) and "Getting Started" (lines 20–27) anchors currently use `hover:underline`. Switch to a persistent `underline`. The footer is global (rendered in [app/layout.tsx](app/layout.tsx) line 40), so "on all pages" is satisfied by this one change.
* **Dashboard banner (22.3).** [app/dashboard/page.tsx](app/dashboard/page.tsx) — insert the CSS-trimmed banner (the **shared `BannerLogo` from 22.1**) beneath the "Your trips" heading + "Create New Trip" button row (after ~line 123), above the trips list, spanning the full width of the `max-w-5xl` main container. Same single `/banner.png`, same CSS crop — just a wider container.
* **Consolidate appearance controls (22.4).** Two controls move into [app/account/page.tsx](app/account/page.tsx) under a new "Appearance" section: the theme toggle (today a fixed floating button, [components/ui/ThemeToggle.tsx](components/ui/ThemeToggle.tsx)) and the badge-color selector (today on the dashboard via [components/feature/ProfileSelector.tsx](components/feature/ProfileSelector.tsx) line 126). Remove the floating toggle and the dashboard `ProfileSelector` render; surface both inside the account page. Tradeoff acknowledged: theme is no longer toggleable from every screen — that's the requested consolidation.
* **Trip section reorder (22.5).** [app/trips/[id]/page.tsx](app/trips/[id]/page.tsx) currently renders Participants (315–372) → Add a receipt (374–382) → Receipts (384–400) → Share/`InviteLinkManager`, owner-only (402–406) → `SettleUpLedger` (408). Reorder the JSX to Receipts → Add a receipt → Participants → Settle up → Share, preserving every section's behavior and the owner-only guard on Share, and fixing up the `mb-*`/`mt-*` spacing so the new order reads cleanly.

## Success Metric
Qualitative — these are polish fixes validated by the reporter (the app owner) rather than instrumented. PayUp has no analytics today, so success = the five items confirmed fixed on the PR preview with no regression to auth, dashboard, trip, or settle-up flows. Revisit for metrics if/when instrumentation lands.

## Epic Backlog Registry
* **Story 22.1:** Align the login-page logo to the login-card width
* **Story 22.2:** Persistently underline the footer GitHub links
* **Story 22.3:** Add the full-width PayUp banner to the dashboard
* **Story 22.4:** Consolidate theme toggle + badge color into the account page
* **Story 22.5:** Reorder the trip-details sections
* **Story 22.6:** Add a "← Dashboard" back link to the new-trip page

**Sequencing note:** Recommended order is 22.1 → 22.5 as listed. Two couplings: (a) **22.1 introduces the shared `BannerLogo` component that 22.3 reuses**, so 22.1 must land before 22.3; (b) **22.3 and 22.4 both edit `app/dashboard/page.tsx`** (22.3 adds the banner, 22.4 removes the `ProfileSelector`) — do 22.3 first, then 22.4, to keep the diffs clean. 22.2 and 22.5 are independent. No migrations anywhere in this epic.

---

## Story 22.1: Trim the login-page logo and align it to the login-card width
**As a** visitor on the login page,
**I want** a trimmed logo that lines up with the login card beneath it,
**so that** the page looks intentionally composed rather than mismatched.

### Acceptance Criteria
1. The banner's surrounding whitespace is **trimmed via CSS** using the single existing `/banner.png` asset — **no second/cropped image file is added** to the repo.
2. The crop is CSS-only (e.g. an `overflow-hidden` container + `object-cover` + `object-position`, or an `aspect-ratio` wrapper); the wordmark is not stretched or distorted.
3. On [app/page.tsx](app/page.tsx), the trimmed logo is constrained to the login-card width (`max-w-sm`, 384px) and stays horizontally centered, so its edges align with the card below.
4. The crop treatment is extracted into a **reusable `BannerLogo` component** (reused by Story 22.3).
5. No change to the login card, form, or any auth behavior; renders correctly in light and dark mode.
6. `npm run lint` + `npm run build` + `npm test` clean.

## Story 22.2: Persistently underline the footer GitHub links
**As a** user reading the footer,
**I want** the "GitHub" and "Getting Started" links to look like links,
**so that** it's obvious they're clickable without hovering.

### Acceptance Criteria
1. In [components/ui/Footer.tsx](components/ui/Footer.tsx), the "GitHub" link (lines 9–16) and the "Getting Started" link (lines 20–27) are **always underlined**, not underline-on-hover (`hover:underline` → `underline`).
2. Because the footer is global ([app/layout.tsx](app/layout.tsx)), the underline appears on **every page** — no per-page changes needed.
3. `href`, `target="_blank"`, and `rel="noreferrer"` are unchanged; no other footer content is affected. Underline styling is legible in both light and dark mode.
4. `npm run lint` + `npm run build` + `npm test` clean.

## Story 22.3: Add the full-width PayUp banner to the dashboard
**As a** signed-in user on the dashboard,
**I want** the PayUp banner shown on my trips page,
**so that** the app feels branded and consistent with the login page.

### Acceptance Criteria
1. On [app/dashboard/page.tsx](app/dashboard/page.tsx), the **shared `BannerLogo`** (from Story 22.1) is rendered **beneath** the "Your trips" heading + "Create New Trip" button row and **above** the trips list — same single `/banner.png`, same CSS trim.
2. The banner spans the full width of the dashboard's main container (`max-w-5xl`), is trimmed (no surrounding whitespace), and is not distorted.
3. The banner renders correctly in light and dark mode and on small screens (no overflow/horizontal scroll).
4. No change to trip loading, the "Create New Trip" action, or any other dashboard behavior.
5. `npm run lint` + `npm run build` + `npm test` clean.

## Story 22.4: Consolidate theme toggle + badge color into the account page
**As a** user managing my preferences,
**I want** the light/dark toggle and my profile badge color to live on my profile page,
**so that** appearance settings are in one predictable place instead of floating on screen or sitting on the dashboard.

### Acceptance Criteria
1. [app/account/page.tsx](app/account/page.tsx) gains an **"Appearance"** section containing both the **light/dark mode toggle** and the **profile badge color** selector.
2. The **floating theme toggle** ([components/ui/ThemeToggle.tsx](components/ui/ThemeToggle.tsx), fixed bottom-right) is **removed from global display**; the badge-color `ProfileSelector` is **removed from the dashboard** ([app/dashboard/page.tsx](app/dashboard/page.tsx) line 126).
3. Both controls continue to work exactly as before — theme via `useTheme()` / `ThemeContext`, accent via `useAccentColor()` / `AccentColorContext` — including localStorage persistence and existing DB/cross-device sync. **No provider or persistence changes.**
4. Changing the theme or badge color on the account page takes effect app-wide immediately (as today), and the selected values are reflected when returning to the page.
5. Accessible controls (labels, keyboard focus) and correct rendering in light and dark mode.
6. `npm run lint` + `npm run build` + `npm test` clean.

## Story 22.5: Reorder the trip-details sections
**As a** person opening a trip,
**I want** receipts at the top and sharing at the bottom,
**so that** the page follows the order I actually work in.

### Acceptance Criteria
1. On [app/trips/[id]/page.tsx](app/trips/[id]/page.tsx), the sections render in this order: **Receipts list → Add a receipt → Participants → Settle up → Share**.
2. Every section keeps its current behavior and components (`ReceiptList`, `ReceiptUploadZone`/`ReceiptQuotaGate`, participants add/list, `SettleUpLedger`, `InviteLinkManager`); the **Share** section stays **owner-only**.
3. Section spacing (`mb-*` / `mt-*`) is adjusted so the new order has clean, consistent vertical rhythm (no doubled or missing gaps).
4. The trip title/status header and navigation are unchanged; no change to data loading, realtime, or settle-up math.
5. `npm run lint` + `npm run build` + `npm test` clean.

## Story 22.6: Add a "← Dashboard" back link to the new-trip page
**As a** user on the new-trip page,
**I want** a "← Dashboard" link in the top-left like the rest of the app,
**so that** I can go back without using the browser's back button.

### Acceptance Criteria
1. The new-trip page (`/dashboard/new`) shows a top-left **"← Dashboard"** link that navigates to `/dashboard`.
2. It matches the existing back-link pattern used on the account and trip pages (`text-sm text-neutral-500 underline`, "← Dashboard" label).
3. The link sits above the "New trip" heading; page layout/spacing stays clean.
4. No change to trip creation, participant entry, or any other behavior.
5. `npm run lint` + `npm run build` + `npm test` clean.

_(Added from follow-up feedback after the initial five stories; ships in the same PR.)_
