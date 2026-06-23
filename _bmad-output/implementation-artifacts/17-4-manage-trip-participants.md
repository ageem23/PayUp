# Story 17.4: Manage Participants Within a Trip

Status: done

## Story

As a trip participant,
I want to see and edit a trip's participant list after it's created,
so that I can add someone who was missed or remove someone added by mistake.

## Acceptance Criteria

1. The trip page shows the trip's current participant list.
2. A participant can be **added** to the trip; it persists to `trips.participants` and appears in the receipt assignment UI.
3. A participant can be **removed** — but removal is **blocked with a clear explanation** when that participant is referenced by any receipt (as `paid_by` or within any `split_among`); the user is directed to reassign those first.
4. Adds/removes persist server-side and respect access control: the trip owner and approved members may manage participants; non-members cannot.
5. Changes are reflected in the receipt assignment matrix and, where applicable, broadcast to other clients via the Epic 12 realtime channel.
6. Duplicate participant names are prevented.

## Tasks / Subtasks

- [ ] **Participant list UI on the trip page** (AC: 1) — render `trips.participants` with add/remove affordances.
- [ ] **Add participant** (AC: 2, 6) — append to `participants` (reuse the 17.3 parse/dedupe helper for consistency); reject duplicates (case-insensitive).
- [ ] **Reference check before remove** (AC: 3) — before removing a name, scan the trip's receipts: block if the name equals any receipt's `paid_by` or appears in any receipt's `split_among`. Show a clear message naming where it's used and instruct the user to reassign first.
- [ ] **Member-capable write path** (AC: 4) — `trips` UPDATE RLS is **owner-only** today, but participants are collaborative (members edit receipts that reference them). Add a member-capable path: either a column-scoped UPDATE policy for `participants`, or a `SECURITY DEFINER` RPC (e.g. `set_trip_participants(trip_id, names[])`) gated by `is_trip_member()` / owner. **Migration `0016_trip_participants_member_write.sql`** if a policy/RPC is needed. ⚠️ Don't widen owner-only update of other `trips` columns (name, `is_settled`).
- [ ] **Reflect + broadcast** (AC: 5) — the assignment matrix uses the updated participant set; rely on the Epic 12 realtime channel so other clients update.
- [ ] **Manual Supabase apply** of `0016` (if added).
- [ ] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- **Two participant concepts** — this manages `trips.participants` (the JSONB name labels for splitting/`paid_by`), NOT `trip_members` (invited auth accounts). Auth-membership management is explicitly out of scope. [Source: docs/docs/prd/epic-17/epic_17_overview.md#out-of-scope-candidate-follow-ons]
- **Block, don't cascade** — per product decision, removal is refused while referenced; we do NOT auto-migrate splits/payer (that's a deferred follow-on). Keep the block message actionable (say which receipt(s) use the name). [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-174-manage-participants-within-a-trip]
- **RLS wrinkle** — the owner-only `trips` UPDATE policy is why this needs a member-capable path; scope it to participants only so members can't rename or complete the trip. [Source: supabase/migrations/0002_trips.sql]
- Receipts store `paid_by` (varchar) and `split_among` (jsonb) — the reference check reads both across the trip's receipts. [Source: supabase/migrations/0004_receipts.sql]

### Project Structure Notes

- Modify `app/trips/[id]/page.tsx`; possibly add `supabase/migrations/0016_trip_participants_member_write.sql`; reuse the 17.3 participants helper.

### References

- [Source: docs/docs/prd/epic-17/epic_17_overview.md#story-174-manage-participants-within-a-trip]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Completion Notes List

- Migration `0016_trip_participants_member_write.sql`: `set_trip_participants(uuid, text[])` SECURITY DEFINER RPC — authorizes owner **or** `is_trip_member()` and updates **only** `trips.participants` (name/`is_settled` stay owner-only; RLS can't column-scope an UPDATE, hence the RPC). **Manual Supabase apply.**
- `setTripParticipants` util (RPC wrapper) + `receiptsReferencingParticipant` helper in `participants.ts` (pure, +3 tests).
- Trip page: a Participants section — chips with remove, space-separated add (reuses 17.3 parse/dedupe, case-insensitive). **Remove is blocked** when the name is a receipt's `paid_by` or in any `split_among`, with a message naming the receipt(s) (AC3). Owner + members can edit (RPC authority); non-members can't reach the trip.
- Local state updates immediately (settle-up recomputes; the matrix picks up the new set on the receipt page). **Note:** cross-client *participant* broadcast isn't added — `trips` isn't in the Epic 12 realtime publication (only `receipts` is); per AC5's "where applicable," left as a follow-on.
- `npm run lint` + `npm run build` + `npm test` (83) clean.

### File List

**Added:**
- `supabase/migrations/0016_trip_participants_member_write.sql`
- `utils/db/tripParticipants.ts`

**Modified:**
- `utils/participants.ts`
- `tests/unit/participants.test.ts`
- `app/trips/[id]/page.tsx`
