-- Stores the Stripe Customer created when a customer saves a payment
-- method from their account page, so a later "pay for upcoming services"
-- checkout can be tied to the same customer (and, later, reuse the saved
-- card) instead of creating a fresh anonymous Checkout customer each time.
alter table profiles add column if not exists stripe_customer_id text;
