# Story 16.3: Post-Upgrade Regression Verification

Status: ready-for-dev

## Story

As a maintainer,
I want the whole app smoke-tested after the major upgrade,
so that we ship the security fix without breaking core flows.

## Acceptance Criteria

1. The automated suite (lint, build, unit, integration) is green on Next 15 / React 19.
2. A manual smoke pass covers: sign-in (Google + email) and signup; account settings (display name, avatar, preferences, change email/password, forgot/reset password); trips (create, dashboard list); receipts (camera/upload → OCR → edit → delete); item assignment and settle-up; invite links and membership; and realtime sync across clients.
3. `next/image`-backed surfaces (login banner, avatars) render correctly — several alerts touched the Image Optimizer, so this gets explicit attention.
4. The Dependabot security tab shows the 17 addressed alerts as resolved (0 remaining of this set).
5. Any regressions found are fixed, or explicitly ticketed with rationale, before the epic closes.

## Tasks / Subtasks

- [ ] **Automated gate** (AC: 1) — `npm run lint` + `npm run build` + `npm test` green on the upgraded stack.
- [ ] **Manual smoke checklist** (AC: 2) — exercise each critical path and record pass/fail:
  - [ ] Auth: Google sign-in, email login, email registration, logout, forgot/reset password.
  - [ ] Account: edit display name, upload/replace avatar, change theme/accent (and confirm it persists across a reload), change email, change password.
  - [ ] Trips: create a trip, see it on the dashboard, open it.
  - [ ] Receipts: add via camera (mobile) and via upload/drag; OCR populates line items + name/tax/tip; edit a line item; add/delete a line item; delete a receipt.
  - [ ] Split & settle: assign items in the grid; verify proportional tax/tip; open Settle Up and sanity-check the minimal-payment output.
  - [ ] Sharing: generate an invite link; redeem it from a second account; the member can view/edit; realtime edits appear live in another open client.
- [ ] **Image surfaces** (AC: 3) — confirm the login banner and avatars load and optimize correctly under Next 15's image pipeline.
- [ ] **Dependabot confirmation** (AC: 4) — verify the security tab shows the 17 alerts resolved (`gh api repos/ageem23/PayUp/dependabot/alerts?state=open` returns none of this set).
- [ ] **Resolve findings** (AC: 5) — fix regressions, or file follow-ups with clear rationale, before closing the epic.

## Dev Notes

- **This story exists because 16.2 is a framework + React major** — the blast radius is the whole app, so a human smoke pass beyond the automated suite is warranted. [Source: docs/docs/prd/epic-16/epic_16_overview.md#story-163-post-upgrade-regression-verification]
- **Image surfaces get special attention** — multiple Next alerts were Image-Optimizer issues (DoS, disk-cache growth, `remotePatterns`), so the banner (`/banner.png`) and avatars (`avatars` bucket) are the highest-signal things to eyeball. [Source: docs/docs/prd/epic-16/epic_16_overview.md#overview]
- The `verify` skill (run the app and observe behavior) is a good fit for the manual portion; pair it with a second account for the invite/realtime checks.
- **Depends on 16.2** being functionally complete (and ideally 16.1 already merged).

### Project Structure Notes

- No source changes expected unless regressions are found; this is a verification story. Any fixes land against the relevant feature files.

### References

- [Source: docs/docs/prd/epic-16/epic_16_overview.md#story-163-post-upgrade-regression-verification]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
