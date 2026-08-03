-- One-time pre-purchased groom credit packs (Buy 5, Get 1 Free / Buy 9, Get
-- 3 More Free), priced at the pet's own Bath or Full Groom rate at purchase
-- time. Credits never expire and are redeemed one at a time against a
-- matching future appointment for the same pet and service.

create table groom_credit_packs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  pet_id uuid not null references pets (id) on delete cascade,
  service text not null check (service in ('bath', 'haircut')),
  paid_count smallint not null,
  free_count smallint not null,
  credits_used smallint not null default 0,
  unit_price numeric not null,
  total_price numeric not null,
  payment_status payment_status not null default 'unpaid',
  created_at timestamptz not null default now()
);

alter table groom_credit_packs enable row level security;

create policy "groom_credit_packs_select_own_or_admin" on groom_credit_packs
  for select using (auth.uid() = customer_id or is_admin());
create policy "groom_credit_packs_insert_own_or_admin" on groom_credit_packs
  for insert with check (auth.uid() = customer_id or is_admin());
create policy "groom_credit_packs_update_own_or_admin" on groom_credit_packs
  for update using (auth.uid() = customer_id or is_admin());
