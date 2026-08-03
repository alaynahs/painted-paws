-- Tracks when an appointment was cancelled, so cancelled appointments can
-- be hidden from the customer's account page 48 hours after cancellation.

alter table appointments add column if not exists cancelled_at timestamptz;
