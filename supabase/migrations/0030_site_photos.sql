-- Blocks a specific pet from being booked online (e.g. a pet who's become
-- impossible to safely groom), independent of profiles.do_not_book, which
-- blocks the whole customer account instead — this covers the case where
-- the pet parent themselves is still welcome back with a different pet.
alter table pets add column if not exists do_not_book boolean not null default false;

-- Lets the admin manage portfolio and homepage gallery photos directly
-- through the site (upload/edit/delete), instead of needing a code change
-- for every new photo. `location` distinguishes which list a row belongs to
-- ('portfolio' = the Portfolio page grid, 'hero' = the homepage cycling
-- gallery); the same underlying image can be reused across both via
-- separate rows pointing at the same storage_path.

create table site_photos (
  id uuid primary key default gen_random_uuid(),
  location text not null check (location in ('portfolio', 'hero')),
  storage_path text not null,
  caption text not null,
  tag text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table site_photos enable row level security;

create policy "site_photos_select_all" on site_photos
  for select using (true);
create policy "site_photos_admin_write" on site_photos
  for all using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', true)
on conflict (id) do nothing;

create policy "site_photos_public_read" on storage.objects
  for select using (bucket_id = 'site-photos');

create policy "site_photos_admin_insert" on storage.objects
  for insert with check (bucket_id = 'site-photos' and is_admin());

create policy "site_photos_admin_update" on storage.objects
  for update using (bucket_id = 'site-photos' and is_admin());

create policy "site_photos_admin_delete" on storage.objects
  for delete using (bucket_id = 'site-photos' and is_admin());
