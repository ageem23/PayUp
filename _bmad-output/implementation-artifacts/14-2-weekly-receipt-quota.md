# Story 14.2: Server-Enforced Weekly Receipt Quota (Free Tier)

Status: done

## Story

As a product owner protecting OCR cost and the value of the unlimited tier,
I want non-whitelisted users limited to 3 receipts per rolling 7 days, enforced in the database,
so that the cap cannot be bypassed by calling the API directly.

## Acceptance Criteria

1. A `SECURITY DEFINER` helper `public.is_unlimited_user()` returns true when the current user's email is present in `allowed_users`, and is the single source of truth for tier.
2. A receipt insert is **rejected server-side** when the creator is **not** an unlimited user **and** already has **3 or more** receipts with `created_by` = them and `created_at` within the trailing 7 days (rolling window from the moment of insert).
3. Unlimited (whitelisted) users are never limited — their receipt creation is unaffected.
4. Enforcement lives at the database layer (trigger), **not** in client code; bypassing the UI does not bypass the cap.
5. Two near-simultaneous inserts cannot both slip past the limit (the count-and-block is atomic / serialized so the cap holds under concurrency).
6. A rejected insert surfaces a distinguishable error (not a generic failure) that the UI can map to the limit-reached state in 14.4.
7. The window counts only the creating user's own receipts across all trips — not receipts others added to the same trip.

## Tasks / Subtasks

- [ ] **Migration `0010_tier_and_quota.sql`** — depends on `0009` (`created_by`).
  - [ ] **`public.is_unlimited_user()`** (AC: 1) — `language sql stable security definer set search_path = ''`; `select exists(select 1 from public.allowed_users where lower(email) = lower(auth.email()))`.
  - [ ] **`create index if not exists idx_allowed_users_email_lower on public.allowed_users (lower(email));`** (keeps the tier lookup cheap).
  - [ ] **`public.enforce_receipt_quota()` `BEFORE INSERT` trigger function** (AC: 2,3,4,5,7) — `plpgsql security definer set search_path = ''`:
    1. `new.created_by := auth.uid();` (authoritative anti-spoof stamp)
    2. `if public.is_unlimited_user() then return new; end if;` (AC3 bypass)
    3. `perform pg_advisory_xact_lock(hashtext(auth.uid()::text));` (AC5 concurrency)
    4. count own receipts where `created_by = auth.uid() and created_at > now() - interval '7 days'` (AC7)
    5. `if count >= 3 then raise exception 'RECEIPT_QUOTA_EXCEEDED' using errcode = 'P0001', detail = '...';` (AC2, AC6)
  - [ ] **`create trigger trg_enforce_receipt_quota before insert on public.receipts for each row execute function public.enforce_receipt_quota();`**
  - [ ] **`public.receipt_quota_status()` read helper** — used / limit / remaining / `next_available_at` (consumed by 14.4; created here per architecture §10).
- [ ] **Manual Supabase apply** of `0010`.
- [ ] **Verify** with a non-whitelisted fixture user: 1st & 2nd insert succeed, 3rd raises `RECEIPT_QUOTA_EXCEEDED`; a whitelisted user is unaffected. (The gate is still closed at this point — exercise via a test account, not the live signup flow.)
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **This is the dormant meter.** It ships while the auth gate is still closed (14.3 not yet done), so there are no live free-tier users — but it is fully provable against a non-whitelisted test account. By the time 14.3 opens the gate, this cap is already live. [Source: docs/docs/prd/epic-14/epic_14_overview.md#epic-backlog-registry]
- **Trigger, not RLS-subquery** — chosen for (a) a *distinguishable* error message (RLS denial is indistinguishable from a real permission failure, which would break 14.4's friendly messaging) and (b) explicit concurrency control. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#5-d3-weekly-quota-enforcement-the-core-meter]
- **Advisory lock** is transaction-scoped (`pg_advisory_xact_lock`), auto-released at commit/rollback, and serializes only same-user inserts — no global contention. Without it, two concurrent inserts could both read count=1 and both pass. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#5-d3-weekly-quota-enforcement-the-core-meter]
- **Error contract:** client receives `error.message = 'RECEIPT_QUOTA_EXCEEDED'`. Story 14.4 matches exactly this string. Do not change the literal without updating 14.4.
- **`is_unlimited_user()` is `SECURITY DEFINER` with empty `search_path`** so it ignores the known `allowed_users` public-read RLS drift and is injection-hardened. [Source: docs/docs/prd/epic-14/epic_14_architecture.md#3-d1-tier-resolution-is_unlimited_user]
- **`auth.email()` null → treated as free-tier** (fail-closed). Acceptable default.

### Project Structure Notes

- All SQL in `supabase/migrations/0010_tier_and_quota.sql`. No app code changes in this story.
- `allowed_users` is keyed by **email**, not `auth.users.id` — tier resolution must go through `auth.email()`. [Source: docs/04_System_Architecture_Master_v3.md#allowed_users]

### References

- [Source: docs/docs/prd/epic-14/epic_14_overview.md#story-142-server-enforced-weekly-receipt-quota-free-tier]
- [Source: docs/docs/prd/epic-14/epic_14_architecture.md#3-d1-tier-resolution-is_unlimited_user]
- [Source: docs/docs/prd/epic-14/epic_14_architecture.md#5-d3-weekly-quota-enforcement-the-core-meter]
- [Source: docs/docs/prd/epic-14/epic_14_architecture.md#8-d6-quota-read-for-the-ui]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Migration-only (no app change). `0010` adds `is_unlimited_user()` (SECURITY DEFINER, empty search_path, email-normalized), the `idx_allowed_users_email_lower` index, the `enforce_receipt_quota()` BEFORE INSERT trigger (stamp → unlimited-bypass → per-user advisory lock → 7-day count → raise `RECEIPT_QUOTA_EXCEEDED` at ≥3), and the `receipt_quota_status()` read helper.
- Cap `3` is hardcoded in both `enforce_receipt_quota` and `receipt_quota_status`; the migration header flags they must stay in sync.
- Error contract `RECEIPT_QUOTA_EXCEEDED` is the literal Story 14.4 maps — do not change without updating 14.4.
- **Manual Supabase apply** required for `0010`. Dormant until 14.3 opens the gate; provable now against a non-whitelisted test account (1st/2nd/3rd succeed, 4th blocked — note the cap is ≥3 existing → the 4th insert is the one rejected).
- `EXECUTE` granted to `authenticated` only on both helper functions.

### File List

**Added:**
- `supabase/migrations/0010_tier_and_quota.sql`
