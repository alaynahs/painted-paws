-- Adds: note categories for groom_notes, pet-parent notes on appointments,
-- rabies vaccine PDF storage, and an admin bypass on the pets update policy.

create type note_type as enum ('grooming', 'behavior');

alter table groom_notes
  add column note_type note_type not null default 'grooming';

alter table appointments
  add column customer_note text;

alter table pets
  add column rabies_vaccine_path text,
  add column rabies_uploaded_at timestamptz;

-- Admins need to edit any customer's pet, not just their own.
drop policy if exists "pets_update_own" on pets;
create policy "pets_update_own_or_admin" on pets
  for update using (auth.uid() = owner_id or is_admin());

-- Private bucket for rabies vaccine PDFs. Path convention:
-- {owner_id}/{pet_id}.pdf — RLS below checks the owner_id folder segment.
insert into storage.buckets (id, name, public)
values ('vaccine-records', 'vaccine-records', false)
on conflict (id) do nothing;

create policy "vaccine_records_owner_select" on storage.objects
  for select using (
    bucket_id = 'vaccine-records'
    and (auth.uid()::text = (storage.foldername(name))[1] or is_admin())
  );

create policy "vaccine_records_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'vaccine-records'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "vaccine_records_owner_update" on storage.objects
  for update using (
    bucket_id = 'vaccine-records'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "vaccine_records_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'vaccine-records'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
