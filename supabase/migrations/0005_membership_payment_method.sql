-- Record how the first (and presumably recurring) membership payment is
-- taken. Reuses the same payment_method enum already used on appointments.

alter table memberships
  add column payment_method payment_method not null default 'in_person';
