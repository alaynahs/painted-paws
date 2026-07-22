-- Painted Paws: core schema for customer accounts, pet profiles, and bookings.
-- Safe to re-run: drops any partially-created objects from a previous
-- attempt before recreating everything fresh.

drop table if exists groom_notes cascade;
drop table if exists appointments cascade;
drop table if exists pets cascade;
drop table if exists profiles cascade;
drop function if exists handle_new_user cascade;
drop function if exists set_updated_at cascade;
drop function if exists is_admin cascade;
drop type if exists user_role cascade;
drop type if exists pet_species cascade;
drop type if exists coat_length cascade;
drop type if exists appointment_status cascade;
drop type if exists payment_method cascade;
drop type if exists payment_status cascade;

create type user_role as enum ('customer', 'admin');
create type pet_species as enum ('dog', 'cat');
create type coat_length as enum ('short', 'long');
create type appointment_status as enum ('requested', 'confirmed', 'completed', 'cancelled');
create type payment_method as enum ('online', 'in_person');
create type payment_status as enum ('unpaid', 'paid');

-- One row per auth user, holding contact info and role.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A customer's pets, created once and reused across bookings.
create table pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  species pet_species not null,
  breed text not null,
  coat coat_length not null default 'short',
  weight_lb numeric not null,
  color text,
  health_concerns text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Appointments booked against a saved pet profile.
create table appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  pet_id uuid not null references pets (id) on delete cascade,
  service text not null,
  add_ons text[] not null default '{}',
  appointment_date date not null,
  appointment_hour smallint not null check (appointment_hour between 9 and 17),
  status appointment_status not null default 'requested',
  payment_method payment_method not null default 'in_person',
  payment_status payment_status not null default 'unpaid',
  price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_date, appointment_hour)
);

-- Groomer's private notes on a pet, tied to a specific past appointment.
create table groom_notes (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  appointment_id uuid references appointments (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table pets enable row level security;
alter table appointments enable row level security;
alter table groom_notes enable row level security;

create function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- profiles: a user can see/update their own row; admins see all.
create policy "profiles_select_own_or_admin" on profiles
  for select using (auth.uid() = id or is_admin());
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- pets: owners manage their own pets; admins see all.
create policy "pets_select_own_or_admin" on pets
  for select using (auth.uid() = owner_id or is_admin());
create policy "pets_insert_own" on pets
  for insert with check (auth.uid() = owner_id);
create policy "pets_update_own" on pets
  for update using (auth.uid() = owner_id);
create policy "pets_delete_own" on pets
  for delete using (auth.uid() = owner_id);

-- appointments: owners manage their own bookings; admins see/manage all.
create policy "appointments_select_own_or_admin" on appointments
  for select using (auth.uid() = customer_id or is_admin());
create policy "appointments_insert_own" on appointments
  for insert with check (auth.uid() = customer_id);
create policy "appointments_update_own_or_admin" on appointments
  for update using (auth.uid() = customer_id or is_admin());
create policy "appointments_delete_own_or_admin" on appointments
  for delete using (auth.uid() = customer_id or is_admin());

-- groom_notes: admin-only, never exposed to the pet's owner.
create policy "groom_notes_admin_only" on groom_notes
  for all using (is_admin()) with check (is_admin());

-- Keep updated_at current on edit.
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger pets_set_updated_at before update on pets
  for each row execute function set_updated_at();
create trigger appointments_set_updated_at before update on appointments
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
