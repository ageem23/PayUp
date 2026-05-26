# Story 4.1: Supabase Storage Object Buckets Configuration & Client Drag-and-Drop Control

### Status
**Ready for Development**

### Story
**As a** user uploading expense sheets,
**I want** to drag and drop raw invoice image files into a secure area on my trip screen,
**so that** my physical receipt image evidence is securely saved to the cloud instantly.

### Acceptance Criteria
1. A dedicated, public read-accessible binary storage folder named `receipt-images` is provisioned in the Supabase asset storage configuration dashboard.
2. The UI component on the individual Trip Hub view displays a high-contrast drag-and-drop file target block accepting `.jpg`, `.jpeg`, and `.png` image formats.
3. Successfully dragging a file onto the target executes a direct upload statement to the bucket, generating a random unique file name to avoid overwrite collisions.
4. The execution callback returns a valid, unblocked asset path link string that updates the current trip layout form state immediately.

### Tasks / Subtasks
- [ ] Access the Supabase control panel, open the Storage bucket configuration menu, and initialize a new storage system folder named `receipt-images`.
- [ ] Configure Bucket policies to authorize authenticated insert mutations while enabling public media URL read accessibility.
- [ ] Build a drag-and-drop frontend upload zone component using standard browser file event wrappers within `components/feature/ReceiptUploadZone.tsx`.
- [ ] Write the asynchronous target storage deployment function interacting with the Supabase asset client:
  ```typescript
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('receipt-images')
    .upload(fileName, file);