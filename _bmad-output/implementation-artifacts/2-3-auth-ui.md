---
baseline_commit: 195888a17027d21792271b901722565bfacb0924
---

# Story 2.3: Gateway Login Screen UI & Unauthorized Rejection Layouts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a polished, mobile-friendly login/register screen at `/` and a clear `/unauthorized` rejection page,
so that I can authenticate seamlessly, or understand why I was denied when my email isn't on the whitelist.

## Acceptance Criteria

1. `/` renders a responsive login form: email + password inputs and a toggle between **Login** and **Register** modes.
2. Submitting shows a loading state (disabled button / spinner text) so the form can't be double-submitted.
3. When the gatekeeper rejects an email (not whitelisted), the app redirects to `/unauthorized`. A successful, whitelisted auth redirects to `/dashboard`.
4. `/unauthorized` shows an explanatory message ("Access Restricted: Your email is not registered on the platform whitelist. Please contact the administrator.") and a link back to `/`.

## Tasks / Subtasks

- [x] **Wire `AuthProvider`** — wrap `app/layout.tsx`'s `{children}` in `<AuthProvider>` so `useAuth()` is available app-wide. (This is the first time the provider is mounted — see the CI build note below; it's why this story touches `ci.yml`.)
- [x] **Export the rejection sentinel** — in `context/AuthContext.tsx`, `export` the existing `NOT_AUTHORIZED_MESSAGE` so the page can distinguish a whitelist rejection (→ `/unauthorized`) from other auth errors (wrong password → inline error). Avoid brittle re-typing of the string in the page.
- [x] **Build the login form** (AC: #1, #2, #3) — replace `app/page.tsx` with a `"use client"` login screen using `useAuth()` + `useRouter()` (`next/navigation`):
  - Email + password inputs; a Login/Register mode toggle.
  - Mobile-friendly inputs per dev notes: `type="email"` / `type="password"`, `autoComplete="email"`/`"current-password"`/`"new-password"`, `autoCapitalize="none"`, `inputMode="email"`.
  - On submit: set `loading=true`, disable the button; call `signIn`/`signUp`; then:
    - error === `NOT_AUTHORIZED_MESSAGE` → `router.push("/unauthorized")`.
    - other error → show it inline; clear loading.
    - success (`error === null`) → `router.push("/dashboard")`.
  - Responsive Tailwind layout (centered card, `min-h-screen`, `max-w-sm`, high-contrast button).
- [x] **Create `/unauthorized`** (AC: #4) — `app/unauthorized/page.tsx`, a static Server Component with the message and a `<Link href="/">` back home.
- [x] **Add CI build env placeholders** — in `.github/workflows/ci.yml`, give the **Build** step placeholder `NEXT_PUBLIC_SUPABASE_*` env vars (see critical note). Lint does not need them.
- [x] **Verify** — `npm run lint` + `npm run build` clean locally (uses `.env.local`); confirm `/`, `/unauthorized` build. Push and confirm CI green (uses the placeholders).

## Dev Notes

### 🚨 CRITICAL — wiring AuthProvider makes the env guard fire at build (the moment we've been deferring since 1.3)
Mounting `<AuthProvider>` in the root layout pulls `@/utils/supabase/client` into the build graph of every prerendered route (`/`, `/canary`, `/unauthorized`). That client **throws at module-init if `NEXT_PUBLIC_SUPABASE_*` are missing** — so `next build` will now evaluate it.
- **Local build is fine:** `.env.local` exists with both keys (verified).
- **CI will fail without env:** the runner has no `.env.local`. **Fix:** add placeholder env to the `Build` step in `.github/workflows/ci.yml`:
  ```yaml
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
  ```
  `createClient()` does not make network calls at construction, so placeholder values let the build prerender successfully without touching a real DB. Only the `Build` step needs these (lint doesn't evaluate the module).

### `/canary` must stay un-gated (Story 1.2 invariant)
`AuthProvider` only provides React context — it does **not** redirect or block rendering — so wrapping the root layout does not gate `/canary` (still returns 200, still static-ish). Do **not** add any auth redirect/middleware that would intercept `/canary`. [Source: _bmad-output/implementation-artifacts/1-2-canary.md]

### Redirect targets
- **`/unauthorized`** — built here.
- **`/dashboard`** — NOT built in this story; it's **Epic 3 (Story 3.2)**. A successful whitelisted login redirects there per AC#3, so until Epic 3 lands, a successful login will hit a 404 on `/dashboard`. This is an accepted cross-epic gap — do not build `/dashboard` here (scope creep). [Source: docs/docs/prd/epic-2/epic_02_overview.md, docs/docs/prd/epic-3]

### Auth flow specifics (consumes Story 2.2)
- `useAuth()` exposes `signIn`/`signUp`/`signOut`/`user`/`session`/`loading`. `signIn`/`signUp` return `{ error: string | null }`; a whitelist rejection returns `NOT_AUTHORIZED_MESSAGE`. [Source: _bmad-output/implementation-artifacts/2-2-whitelist-enforcement.md]
- The `allowed_users` table is **live now** (Story 2.1 migration applied in Supabase on 2026-06-18), so the whitelist check works end-to-end: a whitelisted email authenticates; a non-whitelisted one is signed out and the form redirects to `/unauthorized`.
- Supabase default sign-up may require email confirmation; a freshly registered user might not have an active session immediately. Don't over-engineer confirmation UX here — surface the returned error/message; full email-confirm flows are out of scope.

### Strict ESLint (gates CI)
- No `any`, no unused vars/imports. Type form handlers (`React.FormEvent<HTMLFormElement>`, `React.ChangeEvent<HTMLInputElement>`).
- `useRouter` from `next/navigation` (App Router), not `next/router`.
- The login page is a Client Component (`"use client"`): it uses state + hooks.

### Project Structure Notes
- New: `app/unauthorized/page.tsx`. Modified: `app/page.tsx` (blank → login form), `app/layout.tsx` (mount `AuthProvider`), `context/AuthContext.tsx` (export sentinel), `.github/workflows/ci.yml` (build env).
- "Tested" = `lint` + `build` clean (no test framework). CodeRabbit (Pro, public repo) provides line-by-line review on the PR.
- Branch: continuing on `epic-2` (carries Stories 2.1/2.2 already merged + the leftover skill/status commits); a fresh PR will be opened for the 2.3 work.

### References
- [Source: docs/docs/prd/epic-2/story_02_3_auth_ui.md] — story, ACs, tasks, mobile dev notes
- [Source: docs/docs/prd/epic-2/epic_02_overview.md] — `/dashboard` (auth landing) + `/unauthorized` routes; gatekeeping model
- [Source: _bmad-output/implementation-artifacts/2-2-whitelist-enforcement.md] — `useAuth()` API + `NOT_AUTHORIZED_MESSAGE`
- [Source: _bmad-output/implementation-artifacts/1-3-supabase.md] — supabase client env guard (now coming due)
- [Source: _bmad-output/implementation-artifacts/1-2-canary.md] — `/canary` must remain un-gated

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-ship-story pipeline

### Debug Log References

- `npm run lint` → `✔ No ESLint warnings or errors`.
- `npm run build` → `✓ Compiled successfully`; routes: `○ /` (login, 1.83 kB), `○ /canary` (138 B, still static + un-gated), `○ /unauthorized`. Built against local `.env.local` (AuthProvider now wired → env guard active).

### Completion Notes List

- **AC#1:** `/` is a responsive `"use client"` login card (`max-w-sm`, centered) with email + password and a Login/Register toggle. Mobile attrs: `type=email/password`, `autoComplete`, `autoCapitalize="none"`, `inputMode="email"`.
- **AC#2:** submit sets `loading`, disables the button (`disabled:opacity-50`, "Please wait…") — no double-submit.
- **AC#3:** on a `NOT_AUTHORIZED_MESSAGE` result → `router.push("/unauthorized")`; on success → `router.push("/dashboard")`; other errors render inline (`role="alert"`). Exported `NOT_AUTHORIZED_MESSAGE` from `AuthContext` for a non-brittle check.
- **AC#4:** `/unauthorized` is a static Server Component with the required message + a `Link` home.
- **AuthProvider wired** in `app/layout.tsx`. This activated the Story 1.3 env guard at build time, so **`.github/workflows/ci.yml` Build step gained placeholder `NEXT_PUBLIC_SUPABASE_*`** (createClient makes no network call at construction). Local build uses real `.env.local`.
- **`/canary` invariant preserved:** AuthProvider provides context only (no redirect), so `/canary` stays un-gated and static (138 B in build output). Verified.
- **Known cross-epic gap:** successful login redirects to `/dashboard`, which is **not built until Epic 3 (Story 3.2)** — a successful whitelisted login 404s until then (per AC; out of scope here).
- **Live end-to-end:** `allowed_users` migration applied in Supabase (2026-06-18), so the whitelist gate works against the real DB.
- Strict ESLint clean (no `any`, no unused); `useRouter` from `next/navigation`.

### File List

**Added:**
- `app/unauthorized/page.tsx`

**Modified:**
- `app/page.tsx` (blank canvas → login form)
- `app/layout.tsx` (mount `AuthProvider`)
- `context/AuthContext.tsx` (export `NOT_AUTHORIZED_MESSAGE`)
- `.github/workflows/ci.yml` (placeholder Supabase env for the Build step)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Login UI at `/` (login/register, loading state, whitelist→`/unauthorized`, success→`/dashboard`), `/unauthorized` page, wired `AuthProvider`, exported rejection sentinel, added CI build env placeholders. Lint/build clean; `/canary` still un-gated. Status → review. | Amelia (Dev) |
| 2026-06-18 | 1.2.0 | CodeRabbit (Pro) full review of the app code: 1 finding (vague convergence wording in the ship-story skill doc) — fixed in `29ca173`, acknowledged by CodeRabbit. CI green. Story 2.3 application code reviewed clean → done (ready-to-merge). Completes Epic 2. | Amelia (Dev) |
