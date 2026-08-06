-- Lightweight funnel tracking for the booking flow — not full page-by-page
-- analytics, just the two meaningful client-side checkpoints that aren't
-- already implied by other data: landing on the booking form, and picking
-- a time slot. "Booked" and "paid" are already known from appointments
-- (created_at, payment_status), so those don't need separate events.
create table booking_funnel_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  step text not null check (step in ('landed', 'picked_time')),
  created_at timestamptz not null default now()
);

create index booking_funnel_events_customer_idx on booking_funnel_events (customer_id, step);

alter table booking_funnel_events enable row level security;

create policy "booking_funnel_events_insert_own" on booking_funnel_events
  for insert with check (auth.uid() = customer_id);

create policy "booking_funnel_events_select_admin" on booking_funnel_events
  for select using (is_admin());
