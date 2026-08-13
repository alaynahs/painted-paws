-- New notification type for the admin alert sent when a customer racks up
-- their 2nd and 3rd no-call-no-show (the 3rd also auto-blocks them from
-- online booking).
alter type notification_type add value if not exists 'no_call_no_show_warning';
