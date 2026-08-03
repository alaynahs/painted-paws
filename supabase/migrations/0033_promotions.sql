-- Replaces the single hardcoded launch promo (config.promo, plus the
-- appointments.promo_applied boolean) with a real list of promotions the
-- admin can create, name, schedule, and cap independently. Multiple
-- promotions can exist at once; getActivePromotion() picks the best
-- currently-eligible one at booking time.
--
-- max_appointment_lead_days: if set, the promo only discounts a booking
-- whose *appointment date* falls within that many days from today (e.g. 14
-- for "must book within 2 weeks"). Null means no lead-time restriction.
--
-- active: a manual on/off switch independent of starts_at/ends_at, so the
-- admin can pause a promo early without deleting or re-dating it. A promo
-- only actually applies when active = true AND now is within the date range.

create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_percent numeric not null,
  max_uses int,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_appointment_lead_days int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table promotions enable row level security;

create policy "promotions_select_all" on promotions
  for select using (true);

create policy "promotions_admin_write" on promotions
  for all using (is_admin()) with check (is_admin());

-- Identifies which specific promotion (if any) an appointment used, so
-- per-promotion usage caps can be counted. Replaces promo_applied as the
-- source of truth going forward; promo_applied is left in place, unused,
-- for the handful of pre-existing rows.
alter table appointments add column if not exists promo_id uuid references promotions(id);

-- Carries the existing launch promo forward as the first row in the new
-- system, with the "book within 2 weeks" rule the admin just asked for.
-- Adjust the end date in /admin/pricing once deployed if a different
-- window is wanted — this seed just keeps the offer running uninterrupted.
insert into promotions (name, discount_percent, max_uses, starts_at, ends_at, max_appointment_lead_days, active)
values ('Launch Promo', 50, 10, now(), now() + interval '90 days', 14, true);
