-- Tracks the actual expiration date printed on the uploaded rabies vaccine
-- record, so reminders/expired checks use the real date instead of an
-- estimated one-year-from-upload guess.

alter table pets add column if not exists rabies_expires_at date;
