---
baseline_commit: befbaad3fedafe16cb719ed064c247ff02558246
---

# Story 7.3: Google OAuth Single Sign-On & Whitelist Intersection Gateway

Status: done

## Story

As a platform collaborator looking to calculate receipt splits,
I want to securely authenticate using my Google Account via a single click,
so that I can instantly unlock the calculation workspace without managing a separate password while remaining bound to the access whitelist.

## Acceptance Criteria

1. **OAuth redirect loop:** "Continue with Google" triggers `supabase.auth.signInWithOAuth({ provider: 'google' })`, routing the user to Google.
2. **Post-auth interception:** the returning session is intercepted before the app is unlocked.
3. **Whitelist guardrail:** the verified Google email is cross-referenced against `public.allowed_users`; if absent, the session is killed (`signOut()`) and the user lands on `/unauthorized`.
4. **Workspace unlocking:** a whitelisted Google email initializes the session, populates `AuthContext`, and opens the app.

## Tasks / Subtasks

- [x] **Google button** — `app/page.tsx`: brand-styled "Continue with Google" button + divider; `handleGoogle` keeps the form's loading/error state and only surfaces an immediate OAuth error (success redirects away).
- [x] **Handshake trigger** — `AuthContext.signInWithGoogle()`: `signInWithOAuth({ provider: 'google', options: { redirectTo: \`${origin}/auth/callback\` } })`.
- [x] **Callback interception** — `app/auth/callback/page.tsx`: waits for the Supabase-detected session + AuthProvider's whitelist verdict, then routes whitelisted → `/dashboard`, rejected → `/unauthorized`, no session → `/`.
- [x] **Whitelist intersection** — reused the existing `isWhitelisted` (extracted to `utils/auth/whitelist.ts`); `AuthContext.applySession` already signs out unlisted sessions and now also raises `authNotice` so the callback can tell a whitelist rejection apart from "never signed in."
- [x] **Provider config documented** — `.env.example` notes the manual Supabase Dashboard steps (enable Google provider, add the `/auth/callback` redirect URL). No new secret.
- [x] **Test** — `tests/integration/auth/whitelist.test.ts`: email normalization, absent-email → false, query-error fail-closed.

## Dev Notes

### Deviation from the story's server-route shape (intentional)
The story sketches a server route (`exchangeCodeForSession`) that intercepts the session at the server layer. PayUp's auth is entirely **client-side** (`@supabase/supabase-js`, implicit flow, no `@supabase/ssr`/cookies/middleware), so a server route cannot see the session. Instead the **client callback page** enforces the whitelist intersection — functionally equivalent for this SPA and consistent with the existing model, where `AuthContext` is already the single whitelist authority (it signs out unlisted re-hydrated/refreshed sessions, not just fresh password sign-ins). Adopting server-side sessions would be a cross-cutting auth rewrite out of scope for this story.

### Why `authNotice`
`AuthContext.applySession` signs out an unlisted session silently. The OAuth callback needs to distinguish "signed in but not whitelisted" (→ `/unauthorized`) from "no session at all" (→ `/`). `applySession` now sets `authNotice = NOT_AUTHORIZED_MESSAGE` on rejection (cleared on a good session), which the callback reads. `getSession()` awaits the client's URL-detection init, so the callback never redirects before the OAuth session lands.

### Manual deploy step (cannot be automated from code)
Enable the Google provider in the Supabase Dashboard (Auth → Providers → Google) with the Google Cloud OAuth Client ID/Secret, and add `<site>/auth/callback` (+ `http://localhost:3001/auth/callback`) under Auth → URL Configuration → Redirect URLs. Until then the button reaches Google but the redirect is rejected.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔ (new `○ /auth/callback`); `npm test` → 22 passed (5 suites).

### Completion Notes List

- Local self-review pass (correctness/security): no findings. Authoritative cloud review runs once on the epic PR (CodeRabbit).
- Story added to `sprint-status.yaml` this epic (it was in the PRD but untracked); scope confirmed with the user.
- **Manual deploy step required** (Supabase Google provider + redirect URL) — see Dev Notes.

### File List

**Added:**
- `app/auth/callback/page.tsx`
- `utils/auth/whitelist.ts`
- `tests/integration/auth/whitelist.test.ts`

**Modified:**
- `context/AuthContext.tsx` (import shared `isWhitelisted`; add `authNotice` + `signInWithGoogle`)
- `app/page.tsx` (Continue with Google button + handler)
- `.env.example` (Google provider manual-config note)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-19 | 1.0.0 | Google OAuth SSO: handshake + client callback enforcing the whitelist intersection; extracted `isWhitelisted` util; `authNotice` rejection signal; provider config documented. Lint+build+test green. Merged into `epic-7`. | Amelia (Dev) |
