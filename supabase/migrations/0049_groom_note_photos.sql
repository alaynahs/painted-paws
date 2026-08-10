-- Lets the admin attach a photo to a private grooming/behavior note (e.g.
-- documenting a mat, a skin issue, a reference cut) — admin-only, unlike
-- the customer-visible groom_photos table added earlier.
alter table groom_notes add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('groom-note-photos', 'groom-note-photos', false);

create policy "groom_note_photos_admin_select" on storage.objects
  for select using (bucket_id = 'groom-note-photos' and is_admin());

create policy "groom_note_photos_admin_insert" on storage.objects
  for insert with check (bucket_id = 'groom-note-photos' and is_admin());

create policy "groom_note_photos_admin_delete" on storage.objects
  for delete using (bucket_id = 'groom-note-photos' and is_admin());
