-- Bug fix: "no_response_warning" was added as a Quick Message type in code
-- but never added to the notification_type enum, so every send of it has
-- been silently failing to log to notifications_log (the email itself
-- still went out fine — only the log row was rejected).
alter type notification_type add value if not exists 'no_response_warning';
