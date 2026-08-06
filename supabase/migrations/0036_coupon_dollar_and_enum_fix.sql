-- Lets a coupon be either a percentage off OR a flat dollar amount off,
-- instead of only percentage. Exactly one of the two must be set.
alter table coupons alter column discount_percent drop not null;
alter table coupons add column if not exists discount_amount numeric;
alter table coupons add constraint coupons_discount_type_check
  check ((discount_percent is not null) <> (discount_amount is not null));

-- Three notification types were added in application code this session
-- (payment_link, admin_checkout_abandoned, admin_signup_no_booking) but
-- never added to this enum, so logging any of them has been silently
-- failing (the notification itself still sends — only the log row fails).
alter type notification_type add value if not exists 'payment_link';
alter type notification_type add value if not exists 'admin_checkout_abandoned';
alter type notification_type add value if not exists 'admin_signup_no_booking';
alter type notification_type add value if not exists 'coupon_granted';
