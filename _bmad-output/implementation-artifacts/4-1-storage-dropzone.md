---
baseline_commit: e3aadc06442a76ca967470dbd17c1d364e238393
---

# Story 4.1: Supabase Storage Object Buckets Configuration & Client Drag-and-Drop Control

Status: done

## Story

As a user uploading expense sheets,
I want to drag and drop receipt images into a secure area on my trip screen,
so that my receipt evidence is saved to cloud storage instantly.

## Acceptance Criteria

1. A `receipt-images` storage bucket (public read) is provisioned in Supabase.
2. The Trip Hub view (`/trips/[id]`) shows a drag-and-drop target accepting `.jpg`, `.jpeg`, `.png`.
3. Dropping a file uploads it to the bucket with a random unique filename (no overwrite collisions).
4. The upload callback returns the asset's public URL and updates the trip view's state immediately.

## Tasks / Subtasks

- [x] **Provision storage** (AC: #1) — `supabase/migrations/0003_receipt_storage.sql`: create the `receipt-images` bucket (public) + `storage.objects` policies (authenticated insert, public read), idempotent. Applied in Supabase at deploy (or via the Storage dashboard).
- [x] **Create the Trip Hub page** — `app/trips/[id]/page.tsx`. No story explicitly creates `/trips/[id]`, but 4.1/4.2 host their UI there and the dashboard cards already link to it. Build a minimal, auth-guarded hub that loads the trip (by id, owner-scoped) and hosts the upload zone. (Line-item matrix etc. come in Epics 5–8.)
- [x] **Build the upload zone** (AC: #2,#3,#4) — `components/feature/ReceiptUploadZone.tsx`, a `"use client"` drag-and-drop + click-to-browse component:
  ```typescript
  const ext = file.name.split(".").pop()?.toLowerCase();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("receipt-images").upload(fileName, file);
  const { data } = supabase.storage.from("receipt-images").getPublicUrl(fileName);
  onUploaded(data.publicUrl);
  ```
  Validate extension client-side; expose an `onUploaded(publicUrl)` callback so the parent updates state (AC#4).
- [x] **Verify** — `npm run lint` + `npm run build` clean.

## Dev Notes

### Storage provisioning (deploy step)
- Bucket + policies as SQL (reproducible) — apply `0003_receipt_storage.sql` in the Supabase SQL editor, OR create the bucket in the Storage dashboard and let the policies apply. `storage.objects` has RLS by default; the migration adds: `for insert to authenticated with check (bucket_id = 'receipt-images')` and `for select using (bucket_id = 'receipt-images')` (public read). Bucket is `public = true` so `getPublicUrl` yields a directly viewable link.
- `crypto.randomUUID()` runs only in the browser (this is a `"use client"` component) — no SSR/build concern.

### Trip Hub scope
- Owner-scoped trip load: `from("trips").select(...).eq("id", id).eq("user_id", user.id).maybeSingle()` (RLS already enforces ownership; the explicit filter is belt-and-suspenders). Auth-guard → redirect `/` if unauthenticated; "Trip not found" if the id isn't the user's.
- In 4.1, `onUploaded` just stores the URL in page state + shows a confirmation link. **Story 4.2** replaces that with opening the staging modal (passing the uploaded URL) and inserting the `receipts` row. Keep the upload zone's API (`onUploaded(url)`) stable for 4.2.

### Consumes prior work
- `trips` table + RLS (Epic 3); `useAuth()` + `AuthProvider` (Epic 2); `supabase` client (1.3). Build env guard already handled (CI placeholders + local `.env.local`) — no `ci.yml` change.
- Strict ESLint: no `any`, no unused; type DnD/file handlers (`DragEvent`, `ChangeEvent<HTMLInputElement>`, `File`); `useParams`/`useRouter` from `next/navigation`.

### Project Structure Notes
- New: `supabase/migrations/0003_receipt_storage.sql`, `app/trips/[id]/page.tsx`, `components/feature/ReceiptUploadZone.tsx`. "Tested" = lint + build; cloud review at the Epic 4 PR.

### References
- [Source: docs/docs/prd/epic-4/story_04_1_storage_dropzone.md] — story, ACs, upload snippet
- [Source: docs/docs/prd/epic-4/epic_04_overview.md] — `receipt-images` bucket, `/trips/[id]` dropzone, `image_url`
- [Source: _bmad-output/implementation-artifacts/3-1-trip-creation.md] — `trips` schema/RLS this reads from

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` clean; `npm run build` → `ƒ /trips/[id]` (dynamic) builds; other routes unchanged.

### Completion Notes List

- **AC#1:** `0003_receipt_storage.sql` provisions the public `receipt-images` bucket + `storage.objects` policies (authenticated insert, public read), idempotent. **Apply in Supabase at deploy.**
- **AC#2/#3/#4:** `ReceiptUploadZone` — drag-and-drop + click-to-browse, validates `.jpg/.jpeg/.png`, uploads with a `crypto.randomUUID()` filename (no collisions), then `getPublicUrl` → `onUploaded(publicUrl)`; uploading + error states.
- **Trip Hub created:** `app/trips/[id]/page.tsx` — auth-guarded, owner-scoped trip load (`maybeSingle`), "Trip not found" fallback, hosts the upload zone and shows the uploaded URL. This is the `/trips/[id]` route the dashboard cards point at (was 404 until now).
- In 4.1 `onUploaded` stores the URL + shows a confirmation link; **Story 4.2** swaps that for the staging modal (the `onUploaded(url)` API stays stable).
- Strict ESLint clean (typed DnD/file handlers, no `any`). Local review clean.

### File List

**Added:**
- `supabase/migrations/0003_receipt_storage.sql`
- `components/feature/ReceiptUploadZone.tsx`
- `app/trips/[id]/page.tsx`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Storage bucket migration + drag-and-drop `ReceiptUploadZone` + minimal Trip Hub at `/trips/[id]` hosting the upload. Lint/build clean; local review clean. Merged into `epic-4`. | Amelia (Dev) |
