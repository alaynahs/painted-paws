-- Tracks whether an account's owner has ever actually chosen their own
-- password, as opposed to still sitting on the random unusable one Supabase
-- auto-generates for admin-created accounts (e.g. a walk-in the groomer
-- booked by phone). Powers the new "haven't created a password yet?" flow
-- on the login page, which needs to tell those two cases apart.
alter table profiles add column if not exists password_set boolean not null default false;

-- Backfill: anyone who's ever actually logged in must already know a real,
-- working password (or signs in via Google, which doesn't touch this flow
-- either way) — so only accounts that have never logged in stay flagged as
-- still needing one, which is exactly the walk-in-customer case this exists
-- for.
update profiles set password_set = true
where id in (select id from auth.users where last_sign_in_at is not null);
