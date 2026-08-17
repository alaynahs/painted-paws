-- Distinguishes a "before" shot from an "after" shot on the same
-- customer-visible groom_photos table, so the post-visit email can link to
-- a page showing both for that specific appointment. Existing photos (and
-- ones uploaded without picking a type) stay null — they just don't show
-- up in the before/after pair, same as today.
alter table groom_photos add column if not exists photo_type text
  check (photo_type in ('before', 'after'));
