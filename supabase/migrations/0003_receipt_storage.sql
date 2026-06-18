-- Migration: receipt-images storage bucket + policies (Epic 4, Story 4.1)
-- Apply in the Supabase SQL editor (or provision the bucket via the Storage
-- dashboard). Idempotent / re-runnable.

-- Public-read bucket for uploaded receipt images. DO UPDATE keeps provisioning
-- convergent — re-running enforces public = true even if the bucket pre-exists.
insert into storage.buckets (id, name, public)
values ('receipt-images', 'receipt-images', true)
on conflict (id) do update set public = true;

-- Authenticated users may upload image files (jpg/jpeg/png) into the bucket.
-- The filename check is server-side defense-in-depth beyond the client's
-- extension validation.
drop policy if exists "Authenticated can upload receipt images" on storage.objects;
create policy "Authenticated can upload receipt images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipt-images'
    and name ~* '\.(jpe?g|png)$'
  );

-- Anyone may read receipt images (bucket is public; getPublicUrl links work).
drop policy if exists "Public can read receipt images" on storage.objects;
create policy "Public can read receipt images" on storage.objects
  for select
  using (bucket_id = 'receipt-images');
