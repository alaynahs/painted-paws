-- Records the flat-dollar "book 4+ weeks ahead" discount actually applied
-- to an appointment at booking time, so edits can carry it forward
-- unchanged (same pattern as promo_id) rather than re-evaluating it against
-- a possibly-rescheduled date.

alter table appointments add column if not exists advance_booking_discount numeric not null default 0;
