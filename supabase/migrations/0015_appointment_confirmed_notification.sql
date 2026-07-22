-- Adds a log type for the "your appointment is confirmed" email sent to the
-- pet parent whenever an appointment moves from requested to confirmed.
alter type notification_type add value if not exists 'appointment_confirmed';
