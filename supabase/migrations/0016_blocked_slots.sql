-- Lets the admin close off a whole day or a specific hour so customers can't
-- book it (vacation, personal appointments, etc). blocked_hour = null means
-- the entire day is closed.

create table blocked_slots (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  blocked_hour int,
  reason text,
  created_at timestamptz not null default now()
);

alter table blocked_slots enable row level security;

create policy "blocked_slots_select_all" on blocked_slots
  for select using (true);

create policy "blocked_slots_admin_write" on blocked_slots
  for all using (is_admin()) with check (is_admin());
