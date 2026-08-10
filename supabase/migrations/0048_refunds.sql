-- Lets the admin issue a one-click refund from an appointment's own page
-- instead of switching over to the Stripe dashboard. Needs the actual
-- Stripe payment_intent id captured at payment time (webhook), since that's
-- what stripe.refunds.create() refunds against.
alter table appointments add column if not exists stripe_payment_intent_id text;

alter type payment_status add value if not exists 'refunded';
