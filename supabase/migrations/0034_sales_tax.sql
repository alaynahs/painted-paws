-- Texas taxes dog/cat grooming as a service (Comptroller Rule 3.292), so
-- every charge now includes sales tax. `price`/`monthly_price`/`total_price`
-- remain the actual tax-inclusive amount charged (matching how they're
-- already used everywhere — Pay Now buttons, dashboards, Stripe amounts),
-- and `sales_tax` is added purely as an informational breakdown column
-- alongside it, locked in at the time of the charge so it stays accurate
-- even if the tax rate changes later.

alter table appointments add column if not exists sales_tax numeric not null default 0;
alter table memberships add column if not exists sales_tax numeric;
alter table groom_credit_packs add column if not exists sales_tax numeric not null default 0;
