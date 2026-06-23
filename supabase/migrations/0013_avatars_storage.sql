-- Migration: profile avatars (Epic 15, Story 15.3). Depends on 0012 (profiles).
-- Adds profiles.avatar_url and a dedicated public-read `avatars` storage bucket
-- with per-user OWN-FOLDER write policies (a user can only write/replace their
-- own avatar under avatars/{auth.uid()}/...). Apply in the Supabase SQL editor.
-- Idempotent.

alter table public.profiles
  add column if not exists avatar_url text;

-- Public-read bucket for avatars (mirrors receipt-images, 0003).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Own-folder write: the first path segment must be the caller's uid, so a user
-- can only upload into avatars/{their uid}/. jpg/png name check is server-side
-- defense-in-depth beyond the client validation.
drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~* '\.(jpe?g|png)$'
  );

-- Replace (upsert overwrites) — same own-folder + jpg/png constraint as INSERT.
drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~* '\.(jpe?g|png)$'
  );

-- Delete own prior avatar (cleanup on replace so objects don't accumulate).
drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone may read avatars (bucket is public; getPublicUrl links work).
drop policy if exists "Public can read avatars" on storage.objects;
create policy "Public can read avatars" on storage.objects
  for select
  using (bucket_id = 'avatars');
