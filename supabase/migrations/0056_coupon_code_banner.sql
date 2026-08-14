-- Lets the admin feature one shareable coupon code in the site-wide banner
-- (e.g. for a Meta ad promo code) — purely an announcement, unlike a
-- promotions-table promo. The discount still only unlocks if a customer
-- actually types the code in at checkout.
alter table coupons add column if not exists featured_banner boolean not null default false;

-- A promotion's end date is now optional — null means it just keeps running
-- until manually deactivated or deleted, rather than requiring a guessed
-- far-future date.
alter table promotions alter column ends_at drop not null;
