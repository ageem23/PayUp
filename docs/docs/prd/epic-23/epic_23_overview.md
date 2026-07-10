# Epic 23: Beta Readiness — Feedback Capture & Error Logging

## Overview
PayUp is leaving UAT and entering **beta** with real external testers. Today the app has **no feedback channel and no observability**: a tester who hits a bug has nowhere to report it, and when JavaScript throws (client) or an API route fails (server) the error is lost — at best a generic "please try again" message, at worst a silent failure. We'd be flying blind exactly when we most need to see.

This epic closes that gap with **first-party, Supabase-backed** feedback and error logging (no third-party SaaS — the data stays in our own database, which matters for beta testers who are real users):
- A **floating help widget** (bottom-right, echoing the old theme-toggle placement) with a pop-up menu.
- The menu links to **Getting Started** (the HELP.md link currently only in the footer) and offers two free-text forms — **"Report an error"** and **"Suggest a feature"** — each capturing the tester's message plus the page they were on and the receipt/trip in context.
- **Automatic client-side error logging** — uncaught JS errors and unhandled promise rejections are recorded to Supabase without the user doing anything.
- **Automatic server-side error logging** — API-route / server errors are recorded to Supabase globally.
- A pass to **extend error logging to the highest-value failure points** that currently swallow errors into generic UI.

**Scope:**
- Two Supabase tables (`feedback_reports` for user-submitted reports — both error reports and feature suggestions — `error_logs` for automatic client+server errors) + RLS, migration `0018`, applied manually in Supabase.
- Help widget + menu; Getting Started link; a shared feedback modal for **Report an error** and **Suggest a feature**, both with page + receipt/trip context.
- Global client error handlers (App Router error boundaries + `window` error/rejection listeners) and global server error capture (`instrumentation.ts` `onRequestError` + an API-route wrapper).
- Targeted logging at known failure points (data-access, auth, upload, realtime, OCR).

**Out of scope (deferred):** an in-app admin dashboard to read/triage the logs (review happens via the Supabase dashboard / service role this epic, same pattern as `access_requests`); third-party error/analytics SaaS (Sentry, PostHog); product usage analytics beyond error/feedback events; email/Slack alerting on new errors.

## Target Approach & Technical Notes
* **Data model + write helpers (23.1) are the crux.** Two tables, mirroring the `access_requests` RLS pattern (0011):
  * `feedback_reports` — `id`, `user_id` (→ `auth.users`), `kind` (`error_report` | `feature_request`, default `error_report`), `message text`, `path text`, `context jsonb` (e.g. `{ receipt_id, trip_id }`), `user_agent text`, `created_at`. **RLS:** authenticated users may `insert` their own row (`auth.uid() = user_id`); no user `select` (admin reads via the dashboard/service role).
  * `error_logs` — `id`, `user_id` (nullable — errors happen pre-login), `source` (`client` | `server`), `message text`, `stack text`, `path text`, `context jsonb`, `user_agent text`, `created_at`. **RLS decision (AC-pinned):** allow `insert` from `anon` + `authenticated` **with check** that `user_id is null or user_id = auth.uid()` (a client can't attribute an error to someone else); no `select`. This accepts anonymous inserts so pre-login and server-context errors are captured — a deliberate tradeoff (minor spam risk, mitigated by beta scale + no read access + no PII). Winston (architect) finalizes column shape and the anon-insert policy.
  * A small typed helper module (`utils/logging/…`) exposes `submitFeedback(...)` and `logError(...)` used by every later story, so the write path lives in one place. It **reuses the existing anon `supabase` client** (client and server) — consistent with the project's no-service-role stance (see `app/api/ocr/route.ts`). If the architect prefers a service-role server client for server logs, that's the alternative; AC pins the choice.
  * **Never let logging throw.** Every insert is best-effort and swallow-on-failure (a logging failure must not break the page or recurse).
* **Help widget (23.2).** A client component fixed bottom-right (same corner the removed `ThemeToggle` used, Story 22.4) that opens an accessible pop-up menu (focus trap / `Esc` / click-outside). First item: **Getting Started** → the same `HELP.md` URL the footer uses (factor the URL into one place). Mounted globally in `app/layout.tsx`.
* **Report an error / Suggest a feature (23.3).** Two menu actions open the **same** modal component parameterized by `kind` (`error_report` | `feature_request`) — same `textarea` + submit/cancel, just a different title/label and stored `kind`. On submit it calls `submitFeedback` with: the `kind`, the message, the current route (`usePathname`), a `context` of the receipt/trip in view (read the `receiptId`/`id` route params when on `/trips/[id]` or `/trips/[id]/receipts/[receiptId]`), and `navigator.userAgent`. Clear success / error states; the form never blocks the app if the write fails.
* **Automatic client logging (23.4).** Two layers: (a) App Router **error boundaries** — `app/global-error.tsx` (root) and `app/error.tsx` (segment) that render a friendly fallback **and** `logError(source:'client')`; (b) a mounted listener component wiring `window.addEventListener('error', …)` and `'unhandledrejection'` for non-React errors. **Throttle/dedupe** (drop repeats of the same message within a short window) and guard against logging-induced loops.
* **Automatic server logging (23.5).** Next 16's **`instrumentation.ts` `onRequestError`** hook captures server/route errors globally → `logError(source:'server')`. Plus a thin `withErrorLogging` wrapper for route handlers, applied to `app/api/ocr/route.ts` (which today only `console.error`s Gemini failures) so scan failures land in `error_logs` with route + context. Preserve the existing clean 4xx/5xx responses — logging is additive, never leaks stack detail to the client.
* **Extend coverage (23.6).** Add `logError` at the highest-value points that currently collapse into generic UI (see the suggestions section). Keep each call best-effort and PII-light.

## Suggested additional error-logging areas
Beyond the automatic global hooks, these are the failure points where an explicit log earns the most during beta (23.6 picks the top ones; the rest are documented for later):
* **Supabase data-access failures** — trip load & dashboard list, receipt list/load, profile fetch, and the matrix/JSONB patch writes. These already show "couldn't load / try again" toasts but discard the underlying error — the single biggest blind spot.
* **Auth failures** — sign-in / sign-up / Google OAuth callback and session-refresh errors. Login problems are the most damaging thing to miss in a beta.
* **OCR / receipt-scan failures** — already partly covered by 23.5's wrapper on `/api/ocr`; scan-failure **rate** is a key beta health metric.
* **Image upload failures** — the storage dropzone (a common, environment-dependent failure).
* **Realtime channel errors** — dropped/errored `receipt:${id}` subscriptions (Epic 12), which degrade collaboration silently.
* **Invite-link redemption failures** (Epic 11) and **quota/access errors** (Epic 14) — user-facing dead-ends worth quantifying.
* **Settle-up non-reconciliation** — when the ledger can't balance (the `SettleUpLedger` error state); logging the inputs helps catch math/data edge cases.
* **(Later) breadcrumbs** — attach a short trail of recent route changes/actions to `context` for reproduction. Deferred to keep this epic tight.

## Success Metric
Beta observability itself is the deliverable, measured by **coverage, not adoption**: after this epic we can answer, from Supabase, "how many errors happened this week, on which pages, and what did testers report?" Concretely — feedback reports are queryable, and the client/server error rate (and OCR scan-failure rate) is visible. No in-app dashboard this epic; queries run in the Supabase console.

## Epic Backlog Registry
* **Story 23.1:** Logging schema + write helpers (tables, RLS, `submitFeedback`/`logError`; migration `0018`)
* **Story 23.2:** Floating help widget + menu (Getting Started link)
* **Story 23.3:** "Report an error" & "Suggest a feature" forms (shared modal by `kind`; message + page + receipt/trip context)
* **Story 23.4:** Automatic client-side error logging (error boundaries + global listeners)
* **Story 23.5:** Automatic server-side error logging (`instrumentation.ts` + API-route wrapper)
* **Story 23.6:** Extend error-logging coverage to high-value failure points

**Sequencing note:** Strict-ish order. **23.1 is the foundation** (schema + the `submitFeedback`/`logError` helpers every other story calls) and must land first — it carries the one migration (`0018`). 23.2 builds the widget; 23.3 adds the report form inside it (so 23.2 → 23.3). 23.4 and 23.5 are the automatic client/server hooks (both depend on 23.1's `logError`); 23.6 layers targeted calls on top. One migration, in 23.1.

---

## Story 23.1: Logging schema + write helpers
**As a** developer building beta observability,
**I want** the feedback/error tables and a single write path,
**so that** every other story can record reports and errors consistently and safely.

### Acceptance Criteria
1. Migration `0018_beta_logging.sql` creates `public.feedback_reports` and `public.error_logs` with the columns described in the technical notes; idempotent; applied manually in Supabase.
2. **RLS is enabled on both.** `feedback_reports`: authenticated users may `insert` their own row (`auth.uid() = user_id`); no user `select`. `error_logs`: `insert` allowed for `anon` + `authenticated` **with check** `user_id is null or user_id = auth.uid()`; no user `select`. (This anon-insert decision is pinned here.)
3. A typed helper module exposes `submitFeedback({ message, path, context })` and `logError({ source, message, stack?, path?, context? })`, reusing the existing anon `supabase` client, attaching `user_id` when a session exists and `navigator.userAgent` where available.
4. **Both helpers are best-effort and never throw** — a failed insert is swallowed (optionally `console.warn`) so logging can't break the page or recurse.
5. `npm run lint` + `npm run build` + `npm test` clean. **Manual Supabase apply** of `0018`. Helper unit-tested (insert payload shape + swallow-on-failure).

## Story 23.2: Floating help widget + menu
**As a** beta tester,
**I want** a help button always within reach,
**so that** I can find help or report a problem from any page.

### Acceptance Criteria
1. A floating button is fixed to the bottom-right on every page (mounted in `app/layout.tsx`), in the corner the old `ThemeToggle` used.
2. Clicking it opens a small pop-up menu with: **Getting Started** (linking to the same `HELP.md` URL the footer uses, defined in one shared place), **Report an error**, and **Suggest a feature**. (The two report actions are wired in Story 23.3.)
3. The menu is accessible: keyboard-openable, `Esc` closes, click-outside closes, focus is managed, appropriate `aria` attributes.
4. It renders correctly in light and dark mode and doesn't obscure critical UI on small screens.
5. `npm run lint` + `npm run build` + `npm test` clean.

## Story 23.3: "Report an error" & "Suggest a feature" forms
**As a** beta tester who hit a problem or has an idea,
**I want** to describe it in a quick form,
**so that** the team gets my report with the context of where I was.

### Acceptance Criteria
1. The help menu's **"Report an error"** and **"Suggest a feature"** actions each open the **same** modal component (parameterized by `kind`), with a message `textarea`, a title/label reflecting the kind, and submit/cancel.
2. On submit, `submitFeedback` records: the `kind` (`error_report` | `feature_request`), the message, the current path (`usePathname`), a `context` capturing the receipt and/or trip in view (route params on `/trips/[id]` and `/trips/[id]/receipts/[receiptId]`), and the user agent.
3. Clear success confirmation and a non-blocking error state; empty messages are rejected client-side.
4. The row lands in `feedback_reports` under the submitting user (`user_id = auth.uid()`) with the correct `kind`. The stored fields are the user's own message, the page path, trip/receipt context, and the browser **user-agent** (captured to aid debugging) — no other personal data.
5. A failed submit never crashes the app or the widget. `npm run lint` + `npm run build` + `npm test` clean.

## Story 23.4: Automatic client-side error logging
**As a** developer supporting beta,
**I want** uncaught client errors recorded automatically,
**so that** I see crashes testers never bother to report.

### Acceptance Criteria
1. App Router error boundaries exist — `app/global-error.tsx` (root) and `app/error.tsx` (segment) — each renders a friendly fallback **and** calls `logError({ source: 'client' })` with message + stack + path.
2. A globally-mounted listener records `window` `error` and `unhandledrejection` events (non-React errors) via `logError`.
3. Logging is **throttled/deduped** (repeat of the same message within a short window is dropped) and cannot recurse (a logging failure doesn't itself get logged).
4. Fallback UIs offer a way to recover (retry/reset or a link home) and don't leak stack traces to the user.
5. `npm run lint` + `npm run build` + `npm test` clean; a test covers the dedupe/throttle logic.

## Story 23.5: Automatic server-side error logging
**As a** developer supporting beta,
**I want** server/API errors recorded automatically,
**so that** backend failures are visible without a client report.

### Acceptance Criteria
1. `instrumentation.ts` implements `onRequestError` (Next 16) → `logError({ source: 'server' })` with the route/path and error detail.
2. A `withErrorLogging` wrapper for route handlers is applied to `app/api/ocr/route.ts`, logging Gemini/scan failures to `error_logs` with route + context — **in addition to** the existing `console.error` and the current clean 4xx/5xx responses (no stack detail leaked to the client).
3. Server logging is best-effort (a logging failure never changes the HTTP response) and attaches `user_id` when the request is authenticated.
4. Existing OCR behavior and status codes are unchanged (the existing OCR tests still pass).
5. `npm run lint` + `npm run build` + `npm test` clean.

## Story 23.6: Extend error-logging coverage to high-value failure points
**As a** developer supporting beta,
**I want** explicit logging where errors currently vanish into generic UI,
**so that** the most damaging blind spots are covered.

### Acceptance Criteria
1. `logError` is added at the top-priority points from the suggestions section: **Supabase data-access failures** (trip/dashboard load, receipt list/load, profile fetch, matrix patch), **auth failures** (sign-in / sign-up / OAuth callback), and **image upload failures**.
2. Each call includes a useful `context` (operation name + relevant ids) and stays **best-effort and PII-light**; existing user-facing error messages/toasts are unchanged.
3. Realtime channel errors, invite-redemption, quota/access, and settle-up non-reconciliation are either covered or explicitly logged as deferred in this story's notes (no silent scope drop).
4. No behavior change beyond the added logging; `npm run lint` + `npm run build` + `npm test` clean.
