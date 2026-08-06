-- Lets the admin type an exact time (e.g. 6:15) instead of only picking a
-- whole hour, for cases the fixed customer-facing hour grid doesn't cover.
-- Customer bookings are unaffected — they always submit minute = 0.
alter table appointments add column if not exists appointment_minute smallint not null default 0
  check (appointment_minute between 0 and 59);

-- Widen the hour range so early/late admin-typed times (e.g. 6 AM, 6 PM)
-- aren't rejected outright. The customer-facing picker itself still only
-- ever offers 8 AM-4 PM — this just stops the database from being the
-- thing that blocks an admin from typing something outside that window.
alter table appointments drop constraint if exists appointments_appointment_hour_check;
alter table appointments add constraint appointments_appointment_hour_check
  check (appointment_hour between 6 and 20);

-- The old (date, hour) uniqueness would wrongly block an admin from typing
-- e.g. 9:00 and 9:15 on the same day (different minute, same hour) — find
-- whatever that constraint is actually named and replace it with one that
-- also considers the minute.
do $$
declare
  old_constraint text;
begin
  select conname into old_constraint
  from pg_constraint
  where conrelid = 'appointments'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) ilike '%appointment_date%appointment_hour%'
    and pg_get_constraintdef(oid) not ilike '%appointment_minute%';

  if old_constraint is not null then
    execute format('alter table appointments drop constraint %I', old_constraint);
  end if;
end $$;

alter table appointments add constraint appointments_date_hour_minute_key
  unique (appointment_date, appointment_hour, appointment_minute);
