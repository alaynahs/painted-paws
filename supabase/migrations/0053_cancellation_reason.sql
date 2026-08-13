-- Replaces the old purely time-based no-show guess (cancelled after the
-- appointment time already passed) with an explicit reason picked at
-- cancellation time. "no_call_no_show" is admin-only — a customer
-- cancelling for any reason, even last-minute, is never treated as a
-- no-show.

alter table appointments add column if not exists cancellation_reason text
  check (cancellation_reason in (
    'unable_to_make_it',
    'facility_error',
    'pet_health_behavior',
    'vaccinations_not_current',
    'no_call_no_show'
  ));
