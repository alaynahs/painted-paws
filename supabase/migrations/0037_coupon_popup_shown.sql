-- Tracks whether a customer has already seen the "you got a coupon!"
-- welcome popup for a given coupon, separate from used_at (redeemed) —
-- a customer can see the announcement, not book yet, and the coupon
-- should still show as available until they actually use it.
alter table coupons add column if not exists popup_shown boolean not null default false;
