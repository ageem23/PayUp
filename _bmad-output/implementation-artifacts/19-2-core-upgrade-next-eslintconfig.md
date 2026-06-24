# Story 19.2: Core Upgrade — next + eslint-config-next → 16

Status: done

## Story

As a maintainer, I want Next.js and its lint preset upgraded together to 16, so that the peer-dependency conflict is resolved and the app builds on 16.

(Full acceptance criteria: [docs/docs/prd/epic-19/epic_19_overview.md](../../docs/docs/prd/epic-19/epic_19_overview.md#story-192-core-upgrade--next--eslint-config-next--16).)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Upgraded `next` 15.5 → **16.2.9**, `react`/`react-dom` 19 → **19.2.7**, `eslint-config-next` 15 → **16**, and `eslint` 8 → **10** (+ `@types/react`/`@types/react-dom` latest).
- **The eslint bump is forced here, not deferred:** `eslint-config-next@16` peer-requires ESLint 9+/10, so installing it with ESLint 8 fails `ERESOLVE`. Installing the whole set together resolves cleanly (0 vulnerabilities). The flat-config *file* migration + lint-script change stay in **19.3**.
- **Zero application code changes needed** — the build and all 90 tests pass as-is, validating the Epic 16 async-request-API migration and the 19.1 audit's low-risk verdict.
- **Turbopack is now the default bundler** (`▲ Next.js 16.2.9 (Turbopack)`); no `webpack` config to conflict, so `next build` works with no flag. `next.config.mjs` unchanged (`outputFileTracingRoot` is still a valid top-level key).
- **One-time gotcha:** the first build hit `PageNotFoundError: /auth/callback` from **stale `.next` artifacts** left by the Next 15 builds (Next 16 reorganizes output dirs). Removing `.next` and rebuilding fixed it — no code involved.
- `npm run build` (Turbopack) ✓, `npm test` (90) ✓. `npm run lint` is intentionally broken until 19.3 (`next lint` was removed in Next 16).

### File List

**Modified:**
- `package.json` / `package-lock.json`
