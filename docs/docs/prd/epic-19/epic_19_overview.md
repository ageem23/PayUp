# Epic 19: Next.js 16 Upgrade (+ ESLint flat config / ESLint 10)

## Overview
Three Dependabot PRs are stuck on the same coupled upgrade and **all fail CI**:
- **#29** `next` 15 → 16
- **#30** `eslint-config-next` 15 → 16
- **#28** `eslint` 8 → 10

They can't be merged individually: `eslint-config-next` pins a matching `next` major, so bumping one alone fails `npm install` with `ERESOLVE` (confirmed in #28's and #29's logs). And ESLint 10 only fits once `eslint-config-next` is on 16 (ESLint 9+ defaults to **flat config**, which the current legacy `.eslintrc.json` doesn't use). So this epic moves **next + eslint-config-next together to 16**, migrates linting to **flat config on ESLint 10**, and verifies the app end to end — the natural sequel to Epic 16 (which took us 14 → 15 with the async-request-API migration).

**Why this should be low-to-moderate risk for *this* app:** Epic 16 already did the hard part of the 15 migration — the app is all client components using `useParams`, with the async `cookies()`/`headers()`/`params` work already handled, no `forwardRef`/bare `useRef` issues, and a minimal `next.config.mjs` (just `outputFileTracingRoot`). The remaining risk is Next 16's *own* breaking changes (bundler defaults, `next lint` removal, minimum runtime versions, image/middleware tweaks), which 19.1 inventories before any code changes.

**What's affected in this repo:**
- `package.json` — `next`, `eslint-config-next`, `eslint` versions (+ the `lint` script if `next lint` is removed in 16).
- `.eslintrc.json` — legacy config extending `next/core-web-vitals` + `next/typescript` with two custom rules (`@typescript-eslint/no-unused-vars` underscore pattern, `@typescript-eslint/no-explicit-any`). Must migrate to **flat config** (`eslint.config.mjs`) for ESLint 10, preserving both custom rules.
- `next.config.mjs` — re-validate `outputFileTracingRoot` and any new Next 16 config requirements.
- `.github/workflows/ci.yml` — update the lint step if the command changes from `next lint` to a direct `eslint` invocation.

No database, API, or product-behavior changes intended — this is a framework/tooling upgrade gated on **behavioral parity**.

## Target Approach & Technical Notes
* **Pre-upgrade audit (19.1):** before touching versions, inventory Next 16's breaking changes against what PayUp actually uses and produce a go/no-go + required-change list — the same playbook as Epic 16's 16.1. Focus areas: minimum **Node** version (CI already moved off Node 20 via the setup-node bump), **Turbopack as the default bundler** (does the minimal `next.config.mjs` need anything?), **`next lint` deprecation/removal**, `next/image` defaults, middleware runtime, and any removed/renamed config keys. Confirm the Epic 16 async-API work fully satisfies 16's stricter requirements.
* **Core upgrade (19.2):** bump `next` and `eslint-config-next` to 16 **together** (resolves the peer conflict), update `next.config.mjs` as the audit dictates, and fix any build/runtime breaks. Target: `npm run build` green and the app boots (canary + a manual smoke).
* **ESLint flat config + ESLint 10 (19.3):** migrate `.eslintrc.json` → `eslint.config.mjs` using `eslint-config-next` 16's flat-config export; bump `eslint` to 10; **preserve the two custom rules**. If Next 16 removes `next lint`, replace the `npm run lint` script with a direct `eslint .` invocation and update CI to match. Net result: `npm run lint` passes on ESLint 10 with the same rule coverage.
* **Regression verification (19.4):** full `lint` + `build` + `test`, plus a manual smoke of the high-value flows — Google/email auth, receipt **OCR**, the realtime assignment matrix, and **settle-up** math — and a Vercel preview check. Then resolve #28/#29/#30.
* **No migration numbers** — no SQL/DB changes.
* **Dependabot coupling:** #29 + #30 must land together; #28 depends on them. This epic supersedes all three — close them as superseded (or rebase the grouped bump onto the epic branch); never merge any of the three on its own.

## Epic Backlog Registry
* **Story 19.1:** Next.js 16 Pre-Upgrade Audit & Compatibility Report (breaking-change inventory vs. this app; go/no-go + change list)
* **Story 19.2:** Core Upgrade — `next` + `eslint-config-next` → 16 (build green, app boots)
* **Story 19.3:** ESLint Flat-Config Migration + ESLint 10 (`.eslintrc.json` → `eslint.config.mjs`, preserve custom rules, fix the lint script/CI)
* **Story 19.4:** Post-Upgrade Regression Verification + Supersede #28/#29/#30

**Sequencing note:** strictly ordered. 19.1 (audit) is mostly analysis and de-risks the rest; 19.2 lands the framework bump; 19.3 can only follow 19.2 (flat config depends on `eslint-config-next` 16); 19.4 is the QA gate that closes out the three Dependabot PRs.

---

## Story 19.1: Next.js 16 Pre-Upgrade Audit & Compatibility Report
**As a** maintainer,
**I want** Next 16's breaking changes mapped against what PayUp uses,
**so that** the upgrade is planned, not discovered mid-build.

### Acceptance Criteria
1. A written compatibility report lists every Next 16 breaking change relevant to this app (bundler defaults, `next lint`, runtime minimums, `next/image`, middleware, removed config keys) with a per-item impact: *not used* / *already handled (Epic 16)* / *action needed*.
2. The report confirms whether the minimal `next.config.mjs` (`outputFileTracingRoot`) needs changes under Next 16.
3. A go/no-go recommendation plus the concrete change list that 19.2/19.3 will execute.
4. No production code change required to land this story (analysis only; trivial doc/notes commit).

## Story 19.2: Core Upgrade — next + eslint-config-next → 16
**As a** maintainer,
**I want** Next.js and its lint preset upgraded together to 16,
**so that** the peer-dependency conflict is resolved and the app builds on 16.

### Acceptance Criteria
1. `next` and `eslint-config-next` are both on 16 in `package.json`; `npm install` resolves with no `ERESOLVE`/peer conflict.
2. `next.config.mjs` is updated per the 19.1 audit (or confirmed unchanged).
3. `npm run build` succeeds and the app boots — `/canary` responds and a manual smoke of the dashboard works.
4. Any Next 16 breaking changes flagged in 19.1 are addressed in code.
5. `npm run build` + `npm test` pass. (Lint may be temporarily handled in 19.3 if `next lint` changes.)

## Story 19.3: ESLint Flat-Config Migration + ESLint 10
**As a** maintainer,
**I want** linting migrated to flat config on ESLint 10,
**so that** ESLint 10 installs cleanly and we keep the same rule coverage.

### Acceptance Criteria
1. Linting uses a flat config (`eslint.config.mjs`) built on `eslint-config-next` 16's flat-config export; the legacy `.eslintrc.json` is removed.
2. `eslint` is on 10; `npm install` resolves cleanly.
3. The two custom rules are preserved: `@typescript-eslint/no-unused-vars` with the `^_` args/vars ignore pattern, and `@typescript-eslint/no-explicit-any` as an error.
4. The `npm run lint` script works under Next 16 (switched to a direct `eslint` invocation if `next lint` was removed), and CI (`ci.yml`) is updated to match.
5. `npm run lint` passes with no new violations (or pre-existing ones are fixed/justified).

## Story 19.4: Post-Upgrade Regression Verification + Supersede #28/#29/#30
**As a** maintainer,
**I want** the upgraded app verified across its key flows,
**so that** Next 16 ships without regressions and the Dependabot PRs are closed out.

### Acceptance Criteria
1. `npm run lint` + `npm run build` + `npm test` green on the epic branch / PR.
2. Manual smoke passes for: Google + email auth, receipt **OCR** scan, the **realtime** assignment matrix (live update across clients), and **settle-up** results.
3. The Vercel preview deploys and loads.
4. Dependabot **#28**, **#29**, and **#30** are resolved (closed as superseded by this epic, or rebased onto it) — none merged individually.
