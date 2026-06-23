# Story 16.4: Stay-Current Guardrails

Status: done

## Story

As a maintainer,
I want automated dependency hygiene,
so that we don't silently drift back into known vulnerabilities.

## Acceptance Criteria

1. A `.github/dependabot.yml` enables **version-update** PRs for the npm ecosystem on a schedule (with sensible grouping of minor/patch updates) — not only security alerts.
2. CI runs a dependency **audit gate** (`npm audit --audit-level=high`) that fails the build on new high/critical vulnerabilities.
3. The audit gate's handling of any pre-existing/unavoidable transitive noise is documented (allowlist or threshold), so the gate stays actionable rather than perpetually red or ignored.
4. The configuration is proven by a test run — a Dependabot version-update PR appears, and/or the audit step is shown running in CI.

## Tasks / Subtasks

- [ ] **Add `.github/dependabot.yml`** (AC: 1) — npm ecosystem, weekly schedule, grouped minor/patch updates to avoid PR spam, e.g.:
  ```yaml
  version: 2
  updates:
    - package-ecosystem: "npm"
      directory: "/"
      schedule: { interval: "weekly" }
      groups:
        minor-and-patch:
          update-types: ["minor", "patch"]
  ```
- [ ] **Add an audit gate to CI** (AC: 2) — a step in `.github/workflows/ci.yml` (the existing Lint & Build job, or a sibling job) running `npm audit --audit-level=high`, failing the build on high/critical. Run it after `npm ci`.
- [ ] **Handle existing noise** (AC: 3) — if unavoidable transitive advisories with no fix would keep the gate red, document the chosen approach (threshold tuning, or an allowlist via a tool like `better-npm-audit` / `audit-ci`) in a comment in `ci.yml` and/or `HELP.md`/a CONTRIBUTING note, so the gate is meaningful.
- [ ] **Prove it** (AC: 4) — confirm the audit step runs in a CI run, and/or that Dependabot opens a version-update PR after the config lands.
- [ ] Keep CI's existing least-privilege `permissions: contents: read` intact.

## Dev Notes

- **Alerts ≠ updates today** — Dependabot *security alerts* are clearly on (that's how we found these 17), but there's no `dependabot.yml`, so nothing opens routine version-update PRs, and CI doesn't fail on a new vuln. This story closes that gap. [Source: docs/docs/prd/epic-16/epic_16_overview.md#overview]
- **Existing CI:** `.github/workflows/ci.yml` is a single `build` job (checkout → setup-node 20 → `npm ci` → lint → build → test) with `permissions: contents: read`. Add the audit step here; mirror the existing style. [Source: .github/workflows/ci.yml]
- **Keep the gate actionable** — a gate that's always red gets ignored. Pick `--audit-level=high` (not `moderate`) to start, and allowlist only genuinely unfixable transitive advisories, with a note explaining each. [Source: docs/docs/prd/epic-16/epic_16_overview.md#story-164-stay-current-guardrails]
- **Independent of the upgrade** — can land any time, but is most valuable after 16.1/16.2 so the baseline is already clean (the gate starts green).

### Project Structure Notes

- Add `.github/dependabot.yml`; modify `.github/workflows/ci.yml`. No app source changes.

### References

- [Source: docs/docs/prd/epic-16/epic_16_overview.md#story-164-stay-current-guardrails]
- [Source: .github/workflows/ci.yml]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- `.github/dependabot.yml`: weekly **version-update** PRs for the `npm` ecosystem (minor/patch grouped into one PR, limit 5) plus `github-actions` (grouped). Closes the gap where only *security alerts* were on.
- `.github/workflows/ci.yml`: added a **`npm audit --audit-level=high`** step right after `npm ci` (before lint/build/test), failing the build on new high/critical advisories. Existing `permissions: contents: read` left intact.
- **AC3 (actionable gate):** baseline is clean after 16.1/16.2 (`npm audit` → 0), so the gate starts green; a comment in `ci.yml` documents the allowlist path (`audit-ci`/`better-npm-audit`) for any future unfixable transitive advisory, instead of lowering the threshold.
- **AC4 (proven):** the audit step runs in CI on this branch's push; Dependabot version-update PRs begin once the config lands on `main`.
- Verified locally: `npm audit --audit-level=high` exits 0.

### File List

**Added:**
- `.github/dependabot.yml`

**Modified:**
- `.github/workflows/ci.yml`
