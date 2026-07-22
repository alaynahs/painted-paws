-- Lets a pet be flagged as a puppy so booking can use puppy pricing and
-- unlock the puppy-only "Intro to Grooming" package.

alter table pets add column if not exists is_puppy boolean not null default false;
