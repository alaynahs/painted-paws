-- Audit trail for an appointment's lifecycle — lets the admin see when it
-- was booked, whether a later edit was made by her or by the pet parent,
-- and timestamps for the other lifecycle events (confirmed, cancelled,
-- completed), rather than only ever seeing the appointment's current state.
create table appointment_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  action text not null check (
    action in ('booked', 'edited', 'cancelled', 'confirmed', 'completed')
  ),
  actor_type text not null check (actor_type in ('admin', 'customer', 'system')),
  actor_id uuid references profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index appointment_history_appointment_idx
  on appointment_history (appointment_id, created_at);

alter table appointment_history enable row level security;

-- Admin-only reading — this is an internal tool, not something surfaced to
-- customers. Inserts come from whichever side actually performed the
-- action (a customer editing their own booking logs their own edit).
create policy "appointment_history_select_admin" on appointment_history
  for select using (is_admin());
create policy "appointment_history_insert_admin_or_own" on appointment_history
  for insert with check (is_admin() or actor_id = auth.uid());
