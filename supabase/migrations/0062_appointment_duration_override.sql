-- Lets the admin manually override how long an appointment is expected to
-- take (e.g. "this one's really going to be 9am-12pm"), instead of always
-- relying on the estimate derived from service type. Null means "use the
-- estimate" — most appointments never need this touched.
alter table appointments add column if not exists duration_minutes integer;
