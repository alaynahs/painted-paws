-- Manual admin override to block a customer from booking online (e.g. after
-- an incident), independent of the automatic no-show-count block.
alter table profiles add column if not exists do_not_book boolean not null default false;

-- Marks a pet inactive (e.g. after they've passed away) so it no longer
-- shows up as a bookable option, while their history and profile stay intact.
alter table pets add column if not exists is_active boolean not null default true;
