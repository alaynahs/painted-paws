-- Tips were being paid through Stripe fine, but nothing in the app ever
-- recorded them — the webhook mistook a completed tip checkout for an
-- appointment payment (both include appointmentId in Stripe metadata) and
-- re-ran the appointment-paid logic instead. This table gives tips a real
-- home, and the webhook fix (app code) stops conflating the two.
create table tips (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  customer_id uuid not null references profiles (id) on delete cascade,
  amount_cents int not null,
  created_at timestamptz not null default now()
);

create index tips_customer_idx on tips (customer_id, created_at desc);

alter table tips enable row level security;

create policy "tips_select_own_or_admin" on tips
  for select using (auth.uid() = customer_id or is_admin());

create policy "tips_admin_write" on tips
  for all using (is_admin()) with check (is_admin());

alter type notification_type add value if not exists 'tip_received';
