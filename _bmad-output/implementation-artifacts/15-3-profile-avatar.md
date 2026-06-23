# Story 15.3: Profile Avatar

Status: ready-for-dev

## Story

As a user,
I want a profile picture,
so that my account feels personal and recognizable.

## Acceptance Criteria

1. From `/account`, the user can upload an avatar image; it is stored in a dedicated `avatars` bucket with the same format/size validation rigor as receipt images.
2. `profiles.avatar_url` references the stored image; a storage policy lets a user write/replace **only their own** avatar.
3. The avatar is displayed in the account menu and anywhere the user's own identity is shown.
4. A sensible placeholder/default is shown when no avatar is set.
5. Replacing an avatar overwrites or cleans up the prior object so avatars don't accumulate unbounded orphans.

## Tasks / Subtasks

- [ ] **Migration `0013_avatars_storage.sql`** (AC: 1, 2) — depends on `0012` (profiles).
  - [ ] `alter table public.profiles add column avatar_url text;`
  - [ ] Create the `avatars` storage bucket; add policies mirroring `0003_receipt_storage.sql` — authenticated upload restricted to the user's **own folder** (path convention `avatars/{auth.uid()}/...`), enforced via `storage.foldername(name)[1] = auth.uid()::text` and the same `\.(jpe?g|png)$` name check.
  - [ ] Read access: public read (simple, like receipts) OR signed URLs — pick per how receipts already expose images; match that convention.
  - [ ] ⚠️ Coordinate the migration number (`0013`) with any parallel session.
- [ ] **Upload control on `/account`** (AC: 1, 5) — file input with the existing JPG/PNG + size validation; upload to `avatars/{user_id}/avatar.<ext>` using a **stable path** so a re-upload overwrites the prior object (no orphan growth). Update `profiles.avatar_url`.
- [ ] **Display avatar** (AC: 3, 4) — show the avatar in the account menu (15.1) and the user's own identity surfaces; render a placeholder/initials when `avatar_url` is null.
- [ ] **Manual Supabase apply** of `0013` (bucket creation is a manual Supabase step, like `receipt-images`).
- [ ] `npm run lint` + `npm run build` clean.

## Dev Notes

- **Model on the receipt-images bucket** — reuse its validation and policy shape; the difference is the per-user **own-folder** write constraint so a user can't overwrite someone else's avatar. [Source: supabase/migrations/0003_receipt_storage.sql]
- **Stable object path = free cleanup (AC5)** — uploading to a deterministic path (`{user_id}/avatar.ext`) overwrites rather than accumulating; if you allow varied extensions, delete the previous object on replace. [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-153-profile-avatar]
- **Depends on 15.2** — `avatar_url` is a column on the `profiles` table created there.
- **Reuse the existing upload validation** from the receipt path so format/size rules stay consistent. [Source: components/feature/ReceiptUploadZone.tsx]

### Project Structure Notes

- Add `supabase/migrations/0013_avatars_storage.sql`; extend `app/account/page.tsx` and the account-menu component; reuse `utils/db/profile.ts`.

### References

- [Source: docs/docs/prd/epic-15/epic_15_overview.md#story-153-profile-avatar]
- [Source: supabase/migrations/0003_receipt_storage.sql]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
