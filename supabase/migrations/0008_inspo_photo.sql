-- Optional inspiration photo + written description of the haircut style a
-- pet parent wants, attached to their booking.

alter table appointments
  add column haircut_description text,
  add column inspo_photo_path text;

insert into storage.buckets (id, name, public)
values ('inspo-photos', 'inspo-photos', false)
on conflict (id) do nothing;

create policy "inspo_photos_owner_select" on storage.objects
  for select using (
    bucket_id = 'inspo-photos'
    and (auth.uid()::text = (storage.foldername(name))[1] or is_admin())
  );

create policy "inspo_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'inspo-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
