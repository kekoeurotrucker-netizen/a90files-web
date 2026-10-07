-- Allow authenticated users to read only their own avatar object.
-- Storage upserts require SELECT in addition to INSERT/UPDATE.
create policy "a90_avatars_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'a90-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
