# Story 16.1: Patch Transitive Vulnerabilities (glob, postcss, js-yaml)

Status: done

## Story

As a maintainer,
I want the patchable transitive vulnerabilities fixed without a framework change,
so that we clear the easy, high-value alerts immediately.

## Acceptance Criteria

1. `glob` resolves to ≥ 10.5.0, `postcss` to ≥ 8.5.10, and `js-yaml` to ≥ 4.2.0 in the lockfile (via `package.json` `overrides` or direct dependency updates).
2. `npm ls glob postcss js-yaml` shows no remaining vulnerable versions anywhere in the tree.
3. Dependabot alerts **#1 (glob)**, **#7 (postcss)**, and **#17 (js-yaml)** are resolved.
4. `npm run lint`, `npm run build`, and `npm test` pass.
5. No application behavior changes — this is a dependency-only fix.

## Tasks / Subtasks

- [ ] **Add `overrides` to `package.json`** (AC: 1) — deterministic pinning for transitive deps:
  ```json
  "overrides": {
    "glob": ">=10.5.0",
    "postcss": ">=8.5.10",
    "js-yaml": ">=4.2.0"
  }
  ```
  (If a package is already a direct dependency at a vulnerable version, bump it directly instead of/in addition to the override.)
- [ ] **`npm install`** to regenerate `package-lock.json`, then **`npm ls glob postcss js-yaml`** to confirm no vulnerable versions remain in the tree (AC: 2).
- [ ] **`npm audit`** — confirm alerts for these three packages are gone (AC: 3). (The 14 Next.js alerts remain; they're Story 16.2.)
- [ ] **`npm run lint` + `npm run build` + `npm test`** all clean (AC: 4).
- [ ] Confirm no source changes were needed — overrides only (AC: 5).

## Dev Notes

- **These are transitive, not direct deps** — `glob`, `postcss`, and `js-yaml` are pulled in by tooling (PostCSS via Tailwind/Next's build pipeline; glob/js-yaml via various build tools). `overrides` is the right lever because they're not in `dependencies` directly. [Source: docs/docs/prd/epic-16/epic_16_overview.md#target-approach--technical-notes]
- **glob alert is a CLI command-injection** (`-c`/`--cmd` runs matches with `shell:true`) — PayUp never invokes the glob CLI, so the practical exposure is nil, but pinning ≥ 10.5.0 clears the alert and is free. [Source: GitHub Dependabot alert #1]
- **Independent of the Next upgrade** — this ships first precisely because it needs no framework change and immediately clears a high-severity alert. Do NOT bump `next` here; that's Story 16.2. [Source: docs/docs/prd/epic-16/epic_16_overview.md#epic-backlog-registry]
- After the override, double-check Tailwind's PostCSS pipeline still builds (PostCSS is load-bearing for the CSS build).

### Project Structure Notes

- Touch: `package.json` (`overrides`) and `package-lock.json` (regenerated). No `app/` or source changes expected.

### References

- [Source: docs/docs/prd/epic-16/epic_16_overview.md#story-161-patch-transitive-vulnerabilities-glob-postcss-js-yaml]
- Dependabot alerts #1 (glob, high), #7 (postcss, moderate), #17 (js-yaml, moderate).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- `package.json` `overrides`: `glob >=10.5.0`, `js-yaml >=4.2.0`, and `postcss "$postcss"` (the `$ref` form — postcss is a direct devDep, so a literal version override is rejected by npm with EOVERRIDE; bumped the direct devDep to `^8.5.10` and pointed transitive copies at it).
- Resolved versions after `npm install`: **glob@13.0.6, js-yaml@5.1.0, postcss@8.5.15** — all at/above the required floors; `npm ls` shows no vulnerable copies remaining.
- `npm audit` now lists **only Next.js** advisories (Story 16.2); the glob/postcss/js-yaml alerts are gone.
- `npm run lint` + `npm run build` + `npm test` (75 tests) clean. No source changes — dependency-only.

### File List

**Modified:**
- `package.json`
- `package-lock.json`
