-- Monthly membership tiers (Spa Pup / Royal Pup / Couture Pup), one active
-- membership per pet, with an optional discounted add-on bundle equipped.
-- Safe to re-run: drops any partially-created membership objects first.

drop table if exists memberships cascade;
drop type if exists membership_tier cascade;
drop type if exists membership_status cascade;

create type membership_tier as enum ('spaPup', 'royalPup', 'couturePup');
create type membership_status as enum ('active', 'cancelled');

create table memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  pet_id uuid not null references pets (id) on delete cascade,
  tier membership_tier not null,
  status membership_status not null default 'active',
  addon_bundle text,
  started_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one active membership per pet at a time.
create unique index memberships_one_active_per_pet
  on memberships (pet_id)
  where status = 'active';

alter table memberships enable row level security;

create policy "memberships_select_own_or_admin" on memberships
  for select using (auth.uid() = customer_id or is_admin());
create policy "memberships_insert_own_or_admin" on memberships
  for insert with check (auth.uid() = customer_id or is_admin());
create policy "memberships_update_own_or_admin" on memberships
  for update using (auth.uid() = customer_id or is_admin());
create policy "memberships_delete_own_or_admin" on memberships
  for delete using (auth.uid() = customer_id or is_admin());

create trigger memberships_set_updated_at before update on memberships
  for each row execute function set_updated_at();
