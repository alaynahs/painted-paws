-- Adds a distinct log type for the "you got a new booking" email sent to
-- the business inbox, separate from the customer-facing confirmation.
alter type notification_type add value if not exists 'admin_new_booking';
