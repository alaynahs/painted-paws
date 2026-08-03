-- Tracks whether a cancellation was actually a no-show (cancelled after the
-- appointment time already passed, or by the admin more than 15 minutes
-- late), so repeat no-shows can be blocked from booking online.

alter table appointments add column if not exists no_show boolean not null default false;
