-- Business hours moved to 8 AM–6 PM, with appointments bookable 8 AM–4 PM.
-- The original check only allowed 9–17, which would reject new 8 AM
-- bookings and still (harmlessly) allow a 5 PM one the app no longer offers.

alter table appointments drop constraint if exists appointments_appointment_hour_check;
alter table appointments add constraint appointments_appointment_hour_check
  check (appointment_hour between 8 and 16);
