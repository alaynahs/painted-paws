-- Per-customer coupons the admin can hand out individually (e.g. a
-- one-off apology discount), distinct from the sitewide `promotions` table
-- which applies to everyone. A coupon has no code to enter — it's tied
-- directly to the customer's account and applies automatically the next
-- time they book, then is marked used so it can't apply twice.

create table coupons (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  discount_percent numeric not null,
  note text,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  redeemed_appointment_id uuid references appointments (id) on delete set null
);

alter table coupons enable row level security;

create policy "coupons_select_own" on coupons
  for select using (auth.uid() = customer_id or is_admin());

create policy "coupons_admin_write" on coupons
  for all using (is_admin()) with check (is_admin());

-- Records which coupon (if any) a given appointment used, so the Stripe
-- webhook can mark it redeemed once payment actually confirms — not at
-- booking time, since an abandoned checkout shouldn't burn the coupon.
alter table appointments add column if not exists coupon_id uuid references coupons (id);
