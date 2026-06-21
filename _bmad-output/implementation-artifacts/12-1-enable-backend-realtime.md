---
baseline_commit: 0178dd70e5f5f318287d94cd9cbca580d8258064
---

# Story 12.1: Enable Backend for Real-Time Collaboration

Status: done

## Story

As a developer,
I want Supabase configured for real-time collaboration with correct security policies,
so that we have a secure foundation for live editing.

## Acceptance Criteria

1. ~~Anonymous sign-ins enabled~~ — **intentionally not done** (see Decision below).
2. RLS on `trips`/`receipts` allows owner + member writes (architecture v3) — **already in place from Epic 11**.
3. RLS policies reference `trips.user_id` — yes (owner policies + `is_trip_member` keyed off `trips.user_id`).
4. Policies tested — verified via the migration design; member access shipped/exercised in Epic 11.

## Tasks / Subtasks

- [x] **Realtime publication** — `supabase/migrations/0008_realtime_receipts.sql`: `replica identity full` on `receipts` (so UPDATE payloads carry the full row) + idempotent add of `receipts` to the `supabase_realtime` publication. **Manual Supabase apply.**
- [x] **RLS** — no change needed; Epic 11's `0007` already added owner-OR-member `select`/manage policies on `trips`/`receipts` via `is_trip_member` (keyed off `trips.user_id`).
- [x] **Anonymous auth** — deliberately **not** enabled (Decision).

## Dev Notes

### Decision: no anonymous auth (whitelist preserved)
The spec's 12.1 AC1 / 12.2 AC1 call for `signInAnonymously()` for invite links. That would bypass the `allowed_users` whitelist enforced since Epic 2 and reinforced by the Epic 11 invite flow (anonymous users have no email → `AuthContext` fails closed). Per an explicit product decision, realtime is scoped to **authenticated, whitelisted members** (who already get into a trip via the Epic 11 invite→login→member flow). The anonymous-session ACs are dropped as inconsistent with the established security model.

### Why replica identity full
Supabase `postgres_changes` only includes the changed row's PK by default; `replica identity full` makes the full new row (split_among/tax/tip) available in the UPDATE event the client consumes (12.2).

### No code / no test change
SQL-only backend enablement; `npm run lint`/`build`/`test` are unaffected (verified once on the 12.2 branch which carries the consuming code).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- **Manual deploy step:** apply `0008_realtime_receipts.sql` in Supabase (and leave "Anonymous sign-ins" OFF, per the Decision).
- The realtime subscription that consumes this lands in Story 12.2.

### File List

**Added:**
- `supabase/migrations/0008_realtime_receipts.sql`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-21 | 1.0.0 | Realtime publication + replica identity for `receipts`; RLS reused from Epic 11; anonymous auth intentionally not enabled (whitelist preserved). Merged into `epic-12`. | Amelia (Dev) |
