-- Tracks whether the temporary launch promo (50% off) was applied to a
-- given appointment, so the offer can automatically cap itself at the
-- first N bookings instead of needing to be hand-toggled off.

alter table appointments add column if not exists promo_applied boolean not null default false;
