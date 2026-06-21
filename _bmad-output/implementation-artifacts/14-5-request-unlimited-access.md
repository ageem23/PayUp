# Story 14.5: Request Unlimited Access

Status: ready-for-dev

## Story

As a free-tier user who's hit the receipt cap,
I want to request unlimited access,
so that an admin can whitelist me without me hunting for a contact channel.

## Acceptance Criteria

1. From the upgrade CTA in the limit-reached block (14.4), a free-tier user can submit a request for unlimited access in-app.
2. The request is recorded/notified so an admin can see who asked and act on it (e.g. add them to `allowed_users`); the exact admin tooling can be minimal.
3. The user receives clear confirmation that their request was submitted and what to expect next.
4. Submitting a request does not itself grant access — whitelisting remains an explicit admin action.
5. Duplicate/repeat requests from the same user are handled gracefully (no errors, no spam state).

## Tasks / Subtasks

- [ ] **Migration `0011_access_requests.sql`** (AC: 2, 5)
  - [ ] Create `public.access_requests` (`id`, `user_id` → auth.users, `email`, `status` default `'pending'`, `note`, `created_at`).
  - [ ] `create unique index uq_access_requests_open on public.access_requests (user_id) where status = 'pending';` (one open request per user → graceful dedup, AC5).
  - [ ] `enable row level security` + policies: user inserts own (`auth.uid() = user_id`), user reads own. Admin review via service role / Supabase dashboard (no admin UI this epic). [Source: docs/docs/prd/epic-14/epic_14_architecture.md#9-d7-access-requests-145]
  - [ ] ⚠️ Migration number `0011` assumes the trip-block migration was dropped (D4 superseded). Coordinate with the parallel Epic 13 session before claiming the number.
- [ ] **Request submission UI** (AC: 1, 3) — from the 14.4 limit-reached block's upgrade CTA, a free-tier user submits a request (insert into `access_requests`, status `pending`). Show clear confirmation of what happens next.
- [ ] **Graceful dedup (AC: 5)** — a repeat submission while a `pending` request exists is a no-op/upsert (handle the unique-index conflict cleanly; no error surfaced).
- [ ] **No auto-grant (AC: 4)** — submitting only records the request; access is granted only when an admin adds the email to `allowed_users`.
- [ ] **Manual Supabase apply** of `0011`.
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **Makes the 14.4 nudge actionable** — without it the "get unlimited access" CTA has nowhere to go. Keep it minimal: record the ask, confirm to the user, done. [Source: docs/docs/prd/epic-14/epic_14_overview.md#story-145-request-unlimited-access]
- **Single entry point now** — the request flow is reached only from the receipt limit-reached block (14.4). The former trip-creation entry point was removed when the trip-block story was superseded. [Source: docs/docs/prd/epic-14/epic_14_overview.md#change-log]
- **Admin side is intentionally thin** — reviewing/approving requests is out of scope (epic Out-of-Scope); MVP records to a table an admin reads via the dashboard, and grants by adding the email to `allowed_users`. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#9-d7-access-requests-145]
- **Partial unique index** (`where status = 'pending'`) allows a user to re-request after a prior request is `approved`/`denied`, while preventing duplicate open requests.
- **Granting = adding to `allowed_users`** — once added, `is_unlimited_user()` returns true on their next request and the receipt cap lifts automatically. No other wiring needed.

### Project Structure Notes

- Migration `supabase/migrations/0011_access_requests.sql`. UI hooks into the 14.4 limit-reached block.

### References

- [Source: docs/docs/prd/epic-14/epic_14_overview.md#story-145-request-unlimited-access]
- [Source: docs/docs/prd/epic-14/epic_14_architecture.md#9-d7-access-requests-145]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
