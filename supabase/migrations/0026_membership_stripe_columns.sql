-- Stores the real Stripe subscription/customer IDs so a membership can
-- actually be cancelled through Stripe, not just flagged in our own table.
alter table memberships
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text;
