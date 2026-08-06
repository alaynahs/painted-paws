-- Adds a third funnel checkpoint (landing on the homepage, not just the
-- booking page) and a separate table for site-session-duration tracking.
alter table booking_funnel_events drop constraint if exists booking_funnel_events_step_check;
alter table booking_funnel_events add constraint booking_funnel_events_step_check
  check (step in ('landed', 'picked_time', 'landed_home'));

create table site_session_durations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  duration_seconds int not null,
  created_at timestamptz not null default now()
);

create index site_session_durations_customer_idx on site_session_durations (customer_id);

alter table site_session_durations enable row level security;

create policy "site_session_durations_insert_own" on site_session_durations
  for insert with check (auth.uid() = customer_id);

create policy "site_session_durations_select_admin" on site_session_durations
  for select using (is_admin());
