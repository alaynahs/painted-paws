-- Tracks explicit SMS opt-in consent at signup, with a timestamp, so there's
-- an auditable record for carrier/A2P 10DLC compliance.

alter table profiles add column if not exists sms_consent boolean not null default false;
alter table profiles add column if not exists sms_consent_at timestamptz;
