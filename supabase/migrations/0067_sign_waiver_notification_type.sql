-- Standalone email sent to a customer when an admin phone booking went
-- through without the waiver being signed live — see signWaiverEmail.
alter type notification_type add value if not exists 'sign_waiver';
