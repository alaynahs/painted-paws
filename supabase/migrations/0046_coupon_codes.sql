-- Adds shared/generic coupon codes on top of the existing per-customer
-- coupon system, reusing the same table and redemption/burn machinery
-- rather than building a parallel one.
--
-- A row in `coupons` is now one of three things:
--   1. A personal coupon (existing behavior) — customer_id set, code null.
--   2. A code DEFINITION — customer_id null, code set. Never redeemed
--      directly; it's a template an admin creates from /admin/coupons.
--   3. A code REDEMPTION — customer_id set, code null, source_code_id
--      pointing back at the definition row. Created the moment a customer
--      successfully applies a code, then flows through the exact same
--      used_at/redeemed_appointment_id lifecycle a personal coupon already
--      has (burned by the Stripe webhook on payment confirmation).
alter table coupons alter column customer_id drop not null;
alter table coupons add column if not exists code text;
alter table coupons add column if not exists max_redemptions int;
alter table coupons add column if not exists expires_at timestamptz;
alter table coupons add column if not exists source_code_id uuid references coupons (id) on delete set null;

-- Case-insensitive uniqueness, only enforced where a code actually exists
-- (definition rows) — personal coupons and redemption rows never set this.
create unique index coupons_code_unique_idx on coupons (upper(code)) where code is not null;
