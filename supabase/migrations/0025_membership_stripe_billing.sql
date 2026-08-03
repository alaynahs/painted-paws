-- Memberships are now billed through a real Stripe subscription. A new
-- membership starts "pending" until Stripe confirms the checkout completed
-- (see the webhook), then flips to "active". Run this ALTER TYPE on its own
-- before anything else in the same session references the new value.
alter type membership_status add value if not exists 'pending';
