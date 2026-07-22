-- Lets admins create an appointment on behalf of any customer (e.g. when a
-- customer calls in and the groomer books for them), not just their own.

drop policy if exists "appointments_insert_own" on appointments;
create policy "appointments_insert_own_or_admin" on appointments
  for insert with check (auth.uid() = customer_id or is_admin());
