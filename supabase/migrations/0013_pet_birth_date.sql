-- Replaces the "age in months" number field with an actual date of birth,
-- picked from a calendar. is_puppy is still derived automatically
-- server-side (birth_date < 6 months ago), same as before.

alter table pets add column if not exists birth_date date;
alter table pets drop column if exists age_months;
