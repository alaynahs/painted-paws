-- Photos the admin takes during/after a groom, visible to the pet's owner.
-- customer_id is denormalized onto the row (same convention as
-- waiver_signings) so the select policy can check ownership directly
-- without a subquery through pets.
create table groom_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  customer_id uuid not null references profiles (id) on delete cascade,
  appointment_id uuid references appointments (id) on delete set null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index groom_photos_pet_idx on groom_photos (pet_id, created_at desc);

alter table groom_photos enable row level security;

create policy "groom_photos_select_own_or_admin" on groom_photos
  for select using (auth.uid() = customer_id or is_admin());

create policy "groom_photos_admin_write" on groom_photos
  for all using (is_admin()) with check (is_admin());

-- Private bucket — the admin uploads, the owning customer (or admin) views
-- via a signed URL, same shape as vaccine-records/inspo-photos.
insert into storage.buckets (id, name, public)
values ('groom-photos', 'groom-photos', false);

create policy "groom_photos_owner_or_admin_select" on storage.objects
  for select using (
    bucket_id = 'groom-photos'
    and (auth.uid()::text = (storage.foldername(name))[1] or is_admin())
  );

create policy "groom_photos_admin_insert" on storage.objects
  for insert with check (bucket_id = 'groom-photos' and is_admin());

create policy "groom_photos_admin_update" on storage.objects
  for update using (bucket_id = 'groom-photos' and is_admin());

create policy "groom_photos_admin_delete" on storage.objects
  for delete using (bucket_id = 'groom-photos' and is_admin());
