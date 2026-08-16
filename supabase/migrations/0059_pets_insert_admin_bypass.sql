-- The pets insert policy never had an admin bypass (unlike the matching
-- update policy added back in 0002) — adminCreatePet has been broken from
-- day one for any pet whose owner isn't the admin's own account.
drop policy if exists "pets_insert_own" on pets;
create policy "pets_insert_own_or_admin" on pets
  for insert with check (auth.uid() = owner_id or is_admin());
