-- Optional pickup & drop-off add-on (flat fee, covers up to 2 animals per
-- trip), with the customer's address captured at booking time.

alter table appointments add column if not exists pickup_dropoff boolean not null default false;
alter table appointments add column if not exists pickup_address text;
