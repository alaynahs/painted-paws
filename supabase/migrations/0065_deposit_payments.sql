-- Lets an appointment be paid in two installments (a deposit, then the
-- remaining balance) instead of only ever being fully unpaid or fully paid
-- in one shot. amount_paid tracks cumulative dollars actually collected via
-- Stripe so far, so a deposit and a later remainder both know exactly how
-- much is still owed without re-deriving it.
alter type payment_status add value if not exists 'deposit_paid';
alter table appointments add column if not exists amount_paid numeric not null default 0;
