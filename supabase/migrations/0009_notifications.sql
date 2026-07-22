-- Adds email to profiles (needed to send confirmation/reminder emails) and a
-- notifications_log table so the reminders cron job can tell what's already
-- been sent and avoid duplicates.

alter table profiles add column if not exists email text;

-- Backfill from auth.users for existing accounts.
update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Keep future signups populated too.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop table if exists notifications_log cascade;
drop type if exists notification_type cascade;
drop type if exists notification_channel cascade;
drop type if exists notification_status cascade;

create type notification_type as enum (
  'booking_confirmation',
  'first_time_welcome',
  'new_client_vaccine_reminder',
  'reminder_24h',
  'post_visit_thank_you',
  'review_request',
  'vaccination_expiring',
  'vaccination_expired',
  'rebooking_8wk',
  'rebooking_16wk',
  'pickup_15min',
  'pickup_ready',
  'pickup_on_way',
  'pickup_arrived',
  'pickup_cant_reach',
  'dropoff_on_way'
);
create type notification_channel as enum ('email', 'sms');
create type notification_status as enum ('sent', 'failed', 'skipped');

create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  pet_id uuid references pets (id) on delete cascade,
  appointment_id uuid references appointments (id) on delete cascade,
  type notification_type not null,
  channel notification_channel not null,
  status notification_status not null default 'sent',
  sent_at timestamptz not null default now()
);

create index notifications_log_appointment_idx on notifications_log (appointment_id, type, channel);
create index notifications_log_pet_idx on notifications_log (pet_id, type, channel, sent_at);

alter table notifications_log enable row level security;

create policy "notifications_log_select_own_or_admin" on notifications_log
  for select using (auth.uid() = customer_id or is_admin());
create policy "notifications_log_insert_own_or_admin" on notifications_log
  for insert with check (auth.uid() = customer_id or is_admin());
