# Epic 16: Dependency Security Remediation

## Overview
GitHub Dependabot reports **17 open vulnerability alerts** on PayUp's default branch (6 high, 9 moderate, 2 low). They are not 17 unrelated problems — they collapse into three actions:

1. **Next.js (14 of the 17 alerts).** The app runs **Next.js 14.2.35**. Every one of these fixes — SSRF on WebSocket upgrades, multiple DoS issues in Server Components and the Image Optimizer, App Router XSS, cache poisoning, request smuggling — is published **only in the Next.js 15.x line** (full coverage requires **≥ 15.5.16**). There is no 14.x patch, so a **major-version upgrade (14 → 15) is mandatory** to clear them. Per product decision, we also move **React 18 → 19** at the same time to land on current, jointly-supported releases.
2. **Three patchable transitive packages.** `glob` (high — CLI command injection, fix ≥ 10.5.0), `postcss` (moderate — XSS in stringify, fix ≥ 8.5.10), and `js-yaml` (moderate — quadratic-complexity DoS, fix ≥ 4.2.0). These are resolved by pinning patched versions, no framework change required.
3. **Keeping it from happening again.** Dependabot *alerts* are on, but nothing automatically *updates* dependencies or fails a build on a new high-severity vuln. The epic ends by adding that guardrail.

The goal of Epic 16 is to take the Dependabot security tab to **zero open alerts** for these 17 items, on supported framework versions, with automation that keeps it that way — without regressing any of the app's core flows.

## Target Approach & Technical Notes
* **Transitive fixes via `overrides`:** pin `glob` ≥ 10.5.0, `postcss` ≥ 8.5.10, `js-yaml` ≥ 4.2.0 in `package.json` `overrides`; verify with `npm ls`. Deterministic and independent of the framework upgrade, so it ships first.
* **Next 15 + React 19 via official codemods:** drive the upgrade with `npx @next/codemod@latest upgrade` and the React 19 codemods, then fix what they don't. Bump `next` (≥ 15.5.16), `react`/`react-dom` (19.x), `eslint-config-next`, and `@types/react` / `@types/react-dom` to match.
* **Known breaking surfaces to audit (Next 15):**
  - **Async request APIs** — `cookies()`, `headers()`, `draftMode()` are now async; dynamic-route `params` / `searchParams` passed as props are now Promises. Audit the dynamic routes (`/trips/[id]`, `/trips/[id]/receipts/[receiptId]`, `/invite/[token]`) and the Supabase server helpers. (Client components using the `useParams()` hook are unaffected.)
  - **Caching defaults** — `fetch` and GET Route Handlers are no longer cached by default. Confirm `/api/ocr` and data reads behave as intended.
  - **`next/image`** — several alerts touch the Image Optimizer; confirm the login banner and avatars still render and any image config is valid.
* **Known breaking surfaces to audit (React 19):** stricter types from `@types/react@19` (e.g. `ReactNode`, `useRef` requiring an argument), ref-as-prop replacing some `forwardRef` usage, and removed legacy APIs (`propTypes`/`defaultProps` on function components, string refs, legacy context). Expect to chase TypeScript errors.
* **Verification before close:** automated suite green **and** a manual smoke pass across the app's critical paths, then confirm the Dependabot tab shows the 17 alerts resolved.
* **Guardrails:** a `.github/dependabot.yml` enabling scheduled **version-update** PRs (grouped), plus a **CI audit gate** (`npm audit --audit-level=high`) that fails on new high/critical vulnerabilities.

## Epic Backlog Registry
* **Story 16.1:** Patch Transitive Vulnerabilities (glob, postcss, js-yaml)
* **Story 16.2:** Upgrade to Next.js 15 & React 19
* **Story 16.3:** Post-Upgrade Regression Verification
* **Story 16.4:** Stay-Current Guardrails (Dependabot version updates + CI audit gate)

**Sequencing note:** 16.1 ships first — it's low-risk, needs no framework change, and immediately clears a high-severity alert. 16.2 is the major upgrade (the bulk of the alerts and the risk). 16.3 verifies 16.2 before it's considered done. 16.4 is independent and locks in the gains; it can land last.

---

## Story 16.1: Patch Transitive Vulnerabilities (glob, postcss, js-yaml)
**As a** maintainer,
**I want** the patchable transitive vulnerabilities fixed without a framework change,
**so that** we clear the easy, high-value alerts immediately.

### Acceptance Criteria
1. `glob` resolves to ≥ 10.5.0, `postcss` to ≥ 8.5.10, and `js-yaml` to ≥ 4.2.0 in the lockfile (via `package.json` `overrides` or direct dependency updates).
2. `npm ls glob postcss js-yaml` shows no remaining vulnerable versions anywhere in the tree.
3. Dependabot alerts **#1 (glob)**, **#7 (postcss)**, and **#17 (js-yaml)** are resolved.
4. `npm run lint`, `npm run build`, and `npm test` pass.
5. No application behavior changes — this is a dependency-only fix.

## Story 16.2: Upgrade to Next.js 15 & React 19
**As a** maintainer,
**I want** the app on Next.js 15.5.16 and React 19,
**so that** the 14 Next.js vulnerabilities are eliminated and we're on current, supported releases.

### Acceptance Criteria
1. `next` is upgraded to ≥ 15.5.16, `react` / `react-dom` to 19.x, and `eslint-config-next`, `@types/react`, `@types/react-dom` are updated to matching versions.
2. The official Next.js and React 19 codemods are applied, and the breaking changes they surface are fixed.
3. Async request APIs are handled correctly: any use of `cookies()` / `headers()` / `draftMode()` and any dynamic-route `params` / `searchParams` consumed as props are awaited per Next 15.
4. The app installs cleanly and `npm run lint`, `npm run build`, and `npm test` all pass on the new versions.
5. All 14 Next.js Dependabot alerts (**#2–#6, #8–#16**) are resolved.
6. No functional regressions in the app's critical paths (validated in 16.3).

## Story 16.3: Post-Upgrade Regression Verification
**As a** maintainer,
**I want** the whole app smoke-tested after the major upgrade,
**so that** we ship the security fix without breaking core flows.

### Acceptance Criteria
1. The automated suite (lint, build, unit, integration) is green on Next 15 / React 19.
2. A manual smoke pass covers: sign-in (Google + email) and signup; account settings (display name, avatar, preferences, change email/password, forgot/reset password); trips (create, dashboard list); receipts (camera/upload → OCR → edit → delete); item assignment and settle-up; invite links and membership; and realtime sync across clients.
3. `next/image`-backed surfaces (login banner, avatars) render correctly — several alerts touched the Image Optimizer, so this gets explicit attention.
4. The Dependabot security tab shows the 17 addressed alerts as resolved (0 remaining of this set).
5. Any regressions found are fixed, or explicitly ticketed with rationale, before the epic closes.

## Story 16.4: Stay-Current Guardrails
**As a** maintainer,
**I want** automated dependency hygiene,
**so that** we don't silently drift back into known vulnerabilities.

### Acceptance Criteria
1. A `.github/dependabot.yml` enables **version-update** PRs for the npm ecosystem on a schedule (with sensible grouping of minor/patch updates) — not only security alerts.
2. CI runs a dependency **audit gate** (`npm audit --audit-level=high`) that fails the build on new high/critical vulnerabilities.
3. The audit gate's handling of any pre-existing/unavoidable transitive noise is documented (allowlist or threshold), so the gate stays actionable rather than perpetually red or ignored.
4. The configuration is proven by a test run — a Dependabot version-update PR appears, and/or the audit step is shown running in CI.

---

## Out of Scope (candidate follow-ons)
* **Tailwind CSS 4** upgrade — Tailwind 3.4 is compatible with Next 15 and no alert requires it.
* **Adopting new Next 15 capabilities** (Turbopack builds, the new caching/`use cache` APIs, partial prerendering) beyond what's needed to fix upgrade breakage.
* **Non-security dependency upgrades** unrelated to these alerts — these are handled going forward by the 16.4 Dependabot version-update config, not hand-picked here.
* **Supabase / other ecosystem audits** outside the npm dependency tree.

## Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-23 | 1.0.0 | Initial Epic 16 definition: remediate 17 Dependabot alerts — patch transitive deps (glob/postcss/js-yaml), upgrade Next.js 14→15.5.16 and React 18→19 with breaking-change fixes, full regression verification, and stay-current guardrails (Dependabot version updates + CI audit gate). | John (PM) |
