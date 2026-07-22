-- Replaces the manual "is this a puppy" checkbox with an actual age field.
-- is_puppy (added in 0010) is now derived automatically from age_months
-- server-side, rather than set directly by the pet-parent/admin.

alter table pets add column if not exists age_months integer;
