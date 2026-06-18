---
baseline_commit: 005638388956e7a4af741ffa04dfd18b31113845
---

# Story 2.2: Supabase Auth Integration & Whitelist Enforcement Core Hook

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a security software engineer,
I want an authentication context that wraps Supabase Auth and validates every signed-in/signed-up email against the `allowed_users` whitelist,
so that only invited users can hold a session, and the rest of the app can read auth state from one place.

## Acceptance Criteria

1. Auth uses Supabase Auth client methods (`signInWithPassword`, `signUp`, `signOut`) with the anon client only — no service-role/admin tokens on the client.
2. On sign-in/sign-up, the email is checked against `public.allowed_users`. If it is not present, the session is blocked (sign-up refused before account creation) or the user is immediately signed out (sign-in), and a clear error is returned.
3. Validated auth state (user + session) is exposed cleanly to the React app via context, with a `useAuth()` hook.

## Tasks / Subtasks

- [x] **Create the auth context** (AC: #3) — `context/AuthContext.tsx` as a client component (`"use client"`): an `AuthProvider` holding `user`/`session`/`loading` state (hydrated via `supabase.auth.getSession()` + `onAuthStateChange`), and a `useAuth()` hook that throws if used outside the provider.
- [x] **Login/logout wrappers** (AC: #1) — `signIn(email, password)`, `signUp(email, password)`, `signOut()` using `supabase.auth.*` from `@/utils/supabase/client`. Return a typed `{ error: string | null }` result for the caller (Story 2.3 UI) to display.
- [x] **Whitelist enforcement** (AC: #2) — A helper that queries `allowed_users` by a normalized email (Supabase Auth lowercases emails, so the lookup must too):
  ```typescript
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();
  ```
  - On sign-**up**: check the whitelist **before** calling `signUp` (avoid creating an orphan auth account that isn't whitelisted).
  - On sign-**in**: after a successful `signInWithPassword`, verify the whitelist; if absent, `signOut()` immediately and return an error.
  - Use `.maybeSingle()` (returns `null` data, no error, when absent) rather than `.single()` (which errors on zero rows) for a clean presence check.
- [x] **Verify** — `npm run lint` (no `any`, no unused) + `npm run build` must stay green. **Do NOT wire `AuthProvider` into `app/layout.tsx` in this story** (see build-risk note) — that wiring + login UI is Story 2.3.

## Dev Notes

### 🚨 Build-time env guard (carried forward from Story 1.3 — critical)
`@/utils/supabase/client` throws at **module-init** if `NEXT_PUBLIC_SUPABASE_*` are missing. `AuthContext.tsx` imports that client.
- **CI has no `.env.local`.** If `AuthProvider` is imported by a route/layout that `next build` prerenders, the throw executes and **CI build fails**.
- **Mitigation for this story:** create `AuthContext.tsx` but leave it **unwired** (nothing in the route tree imports it yet). Unimported `"use client"` modules are type-checked but never evaluated by `next build`, so the build stays green — same mechanism that kept Story 1.3 green. Verified by running `npm run build` after implementing.
- **Story 2.3 owns the wiring decision:** when the login screen mounts `AuthProvider`, CI will need placeholder `NEXT_PUBLIC_SUPABASE_*` values in `.github/workflows/ci.yml` `env:`, OR the client must move to lazy/factory init. Flag this for 2.3; do not solve it here.

### Dependencies — none new
`signInWithPassword` / `signUp` / `signOut` live on `supabase.auth`; the whitelist read uses `supabase.from(...)`. All provided by `@supabase/supabase-js` (installed in 1.3). **Do NOT add `@supabase/ssr` or auth-helpers** — cookie/SSR session handling and middleware are a later concern; this story is a client-side context. (If a future story needs server-side session reading in middleware, that's where `@supabase/ssr` gets introduced, with approval.)

### Types (strict ESLint: no `any`)
- Use `User`, `Session` from `@supabase/supabase-js` for state.
- Type the context value explicitly and the login fns as `(email: string, password: string) => Promise<{ error: string | null }>`.
- The untyped `supabase.from("allowed_users")` returns library-inferred types — fine; just don't introduce an explicit `any`. (Our ESLint runs `@typescript-eslint/recommended`, not the type-checked `no-unsafe-*` rules, so library `any` won't error.)
- Watch `react-hooks/exhaustive-deps` (from `next/core-web-vitals`): module-level helpers (`supabase`, the whitelist fn) are stable and don't belong in dep arrays; `useCallback`'d fns that reference other callbacks must list them.

### Security notes (story persona = security engineer)
- AC#1 satisfied by using only the anon client; the anon key is public-by-design (RLS is the real guard). No admin tokens client-side. [Source: _bmad-output/implementation-artifacts/1-3-supabase.md]
- ⚠️ **Known consideration (not in this story's scope):** the `allowed_users` table (Story 2.1) has **no RLS**, so with the anon key the whitelist (all approved emails) is publicly readable via PostgREST. That's enough for this client-side check to function, but it leaks the email list. Tightening this (an RLS policy or moving the check server-side) is a follow-up — the architecture only mandates RLS on `receipts` today. Note for a later security-hardening story; do not change `allowed_users` RLS here. [Source: docs/04_System_Architecture_Master_v3.md]

### Cross-story
- Depends on Story 2.1's `allowed_users` table existing in Supabase (the migration must be applied for the runtime check to work; build/lint don't need it).
- Story 2.3 (login screen + `/unauthorized`) consumes `useAuth()` and mounts `AuthProvider`. Keep the context API clean and minimal for it. [Source: docs/docs/prd/epic-2/epic_02_overview.md]
- "Tested" = `lint` + `build` clean (no test framework; project convention from Epic 1). CodeRabbit (now Pro on this public repo) provides the line-by-line review.

### Project Structure Notes
- New: `context/AuthContext.tsx` (the `context/` dir + `.gitkeep` exist from Story 1.1).
- No changes to `app/layout.tsx` (deferred to 2.3). No `.env`, no CI changes.

### References
- [Source: docs/docs/prd/epic-2/story_02_2_whitelist_enforcement.md] — story, ACs, tasks, query snippet (source file truncated after the `.from('allowed_users')` snippet)
- [Source: docs/docs/prd/epic-2/epic_02_overview.md] — gatekeeping model; 2.1→2.2→2.3
- [Source: _bmad-output/implementation-artifacts/2-1-whitelist-schema.md] — `allowed_users` schema this checks against
- [Source: _bmad-output/implementation-artifacts/1-3-supabase.md] — supabase client + module-init env guard

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-ship-story pipeline

### Debug Log References

- `npm run lint` → `✔ No ESLint warnings or errors`.
- `npm run build` → `✓ Compiled successfully`; route table unchanged (3 routes). `AuthContext` is unwired, so `next build` did not evaluate the env-guarded supabase client → build green without `.env.local`.

### Completion Notes List

- **AC#1:** All auth via the anon `@supabase/supabase-js` client (`supabase.auth.signInWithPassword` / `signUp` / `signOut`). No service-role/admin tokens client-side. No new dependency added.
- **AC#2 (enforcement):**
  - **Sign-up:** whitelist checked **before** `signUp` → refuses (no orphan account) if email absent.
  - **Sign-in:** after a valid `signInWithPassword`, whitelist is verified; if absent, `signOut()` runs immediately and an error is returned (session never lingers).
  - `isWhitelisted()` uses `.maybeSingle()` and **fails closed** (returns false on any query error) — a DB error never silently authorizes a user.
- **AC#3:** `AuthProvider` exposes `{ user, session, loading }` hydrated from `getSession()` + `onAuthStateChange`; `useAuth()` throws if used outside the provider.
- **Strict typing:** `User`/`Session` from `@supabase/supabase-js`; explicit `AuthResult` and context value types; no `any`. `useEffect` uses an `active` guard + `subscription.unsubscribe()` cleanup; `useCallback` deps correct (module-level `supabase`/`isWhitelisted` are stable).
- **Scope held:** `AuthProvider` intentionally **not** wired into `app/layout.tsx` (keeps CI green per the build-guard note); mounting + login UI is Story 2.3. No `.env`/CI changes.
- **Known follow-up (documented, not in scope):** `allowed_users` has no RLS, so the anon client can read the whitelist — functional for this check but leaks the email list; tighten in a later security story.
- **Verification:** lint + build clean (project convention; no test framework). Runtime enforcement depends on the Story 2.1 migration being applied in Supabase.

### File List

**Added:**
- `context/AuthContext.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Added `AuthContext` (Supabase auth wrappers + `allowed_users` whitelist enforcement, fail-closed). Unwired to keep CI green. Lint/build clean. Status → review. | Amelia (Dev) |
| 2026-06-18 | 1.2.0 | Local review found+fixed a case-sensitive whitelist lookup bug (normalize email). CI green on PR #3. CodeRabbit (still Free tier on PR #3, opened while repo was private) produced summary only — no actionable findings. Status → done (ready-to-merge). | Amelia (Dev) |
| 2026-06-18 | 1.3.0 | CodeRabbit (Pro) review (4 findings). **Fixed:** session hydration + `onAuthStateChange` now re-validate the whitelist (previously only signIn/signUp did — a removed/external session would persist); updated 2-2 doc query example to show normalization + checked the enforcement task. **Skipped (with reason):** 2-1 markdownlint MD022/MD031 and AC-bullet rewording — internal planning doc, repo runs no markdown linting; declined to avoid whitespace/prose churn. Status → review (re-review cycle). | Amelia (Dev) |
