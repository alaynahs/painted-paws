-- Lets the admin flag a grooming/behavior/parent note as a "caution" —
-- shown as a stackable icon on the schedule grid so a past issue with this
-- pet/customer is visible again the moment they're back on the books, not
-- just buried in their notes page. Plain text (not its own enum) since
-- there's only one value today and more may be added later without an
-- enum-alteration migration each time.
alter table groom_notes add column if not exists rating text;

-- A third note category for the pet parent/service overall, alongside the
-- existing "grooming" and "behavior" ones — still tied to a pet record
-- (groom_notes has no separate customer-level table), still admin-only.
alter type note_type add value if not exists 'parent';
