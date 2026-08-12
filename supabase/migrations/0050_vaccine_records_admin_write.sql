-- Lets the admin upload a rabies vaccine record on a customer's behalf from
-- the admin pet profile (e.g. a client texts/emails a photo of the record
-- instead of uploading it themselves). The insert/update/delete policies
-- previously only allowed the owner's own uid to write into their folder;
-- select already had an is_admin() bypass, this brings write in line.

drop policy if exists "vaccine_records_owner_insert" on storage.objects;
create policy "vaccine_records_owner_or_admin_insert" on storage.objects
  for insert with check (
    bucket_id = 'vaccine-records'
    and (auth.uid()::text = (storage.foldername(name))[1] or is_admin())
  );

drop policy if exists "vaccine_records_owner_update" on storage.objects;
create policy "vaccine_records_owner_or_admin_update" on storage.objects
  for update using (
    bucket_id = 'vaccine-records'
    and (auth.uid()::text = (storage.foldername(name))[1] or is_admin())
  );

drop policy if exists "vaccine_records_owner_delete" on storage.objects;
create policy "vaccine_records_owner_or_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'vaccine-records'
    and (auth.uid()::text = (storage.foldername(name))[1] or is_admin())
  );
