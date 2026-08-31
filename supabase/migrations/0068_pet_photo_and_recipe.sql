-- Pet profile photo (small identity photo, not a groom before/after shot)
-- and a structured "grooming recipe" the groomer keeps per pet, replacing
-- nothing — haircut_description on appointments stays as the customer's
-- own per-visit request, this is the groomer's own reusable reference.
alter table pets add column if not exists photo_path text;
alter table pets add column if not exists groom_recipe jsonb not null default '{}'::jsonb;

-- Private bucket — the admin uploads, the owning customer (or admin) views
-- via a signed URL, same shape as groom-photos/vaccine-records.
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', false);

create policy "pet_photos_owner_or_admin_select" on storage.objects
  for select using (
    bucket_id = 'pet-photos'
    and (auth.uid()::text = (storage.foldername(name))[1] or is_admin())
  );

create policy "pet_photos_admin_insert" on storage.objects
  for insert with check (bucket_id = 'pet-photos' and is_admin());

create policy "pet_photos_admin_update" on storage.objects
  for update using (bucket_id = 'pet-photos' and is_admin());

create policy "pet_photos_admin_delete" on storage.objects
  for delete using (bucket_id = 'pet-photos' and is_admin());
