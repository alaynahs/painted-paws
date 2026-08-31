-- Same-day operational stage tracking (check-in through ready-for-pickup),
-- separate from appointment_status — status stays about the booking's
-- lifecycle (confirmed/completed/cancelled), these are purely about where
-- a specific in-progress visit is today. Checkout has no new column here;
-- it reuses the existing completed-status flow (markAppointmentComplete).
alter table appointments add column if not exists checked_in_at timestamptz;
alter table appointments add column if not exists groom_started_at timestamptz;
alter table appointments add column if not exists ready_at timestamptz;

alter table appointment_history drop constraint appointment_history_action_check;
alter table appointment_history add constraint appointment_history_action_check check (
  action in (
    'booked', 'edited', 'cancelled', 'confirmed', 'completed',
    'checked_in', 'groom_started', 'ready'
  )
);
