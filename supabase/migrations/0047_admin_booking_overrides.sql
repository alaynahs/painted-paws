-- Lets the admin intentionally book two pets into the exact same time slot
-- (e.g. two dogs from the same household both at 5pm), while still fully
-- protecting online customer bookings from double-booking each other.
alter table appointments add column if not exists admin_booked boolean not null default false;

-- Drop the old blanket (date, hour, minute) uniqueness, whatever it's
-- actually named (recreated under a specific name in migration 0043, but
-- looked up dynamically here in case it differs).
do $$
declare
  old_constraint text;
begin
  select conname into old_constraint
  from pg_constraint
  where conrelid = 'appointments'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) ilike '%appointment_date%appointment_hour%appointment_minute%';

  if old_constraint is not null then
    execute format('alter table appointments drop constraint %I', old_constraint);
  end if;
end $$;

-- Still prevents two customer-initiated bookings from colliding on the same
-- slot; rows the admin created or has touched (admin_booked = true) are
-- exempt on purpose, since a double-booked slot there is a deliberate choice.
create unique index appointments_customer_slot_unique_idx
  on appointments (appointment_date, appointment_hour, appointment_minute)
  where admin_booked = false;
