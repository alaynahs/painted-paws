-- Every appointment booking requires a fresh waiver signature — health
-- check-in questions, consents, and an e-signature — not just a one-time
-- signature on file. Tied to the specific appointment it was signed for.

create table waiver_signings (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  customer_id uuid not null references profiles (id) on delete cascade,
  pet_id uuid not null references pets (id) on delete cascade,
  signed_name text not null,
  signed_date date not null default current_date,
  vaccinated_last_24h boolean not null default false,
  vaccines_current boolean not null,
  behavioral_concerns boolean not null default false,
  senior_or_special_needs boolean not null default false,
  severely_matted boolean not null default false,
  emergency_care_consent boolean not null,
  photo_release_consent boolean not null default false,
  liability_accepted boolean not null,
  created_at timestamptz not null default now()
);

alter table waiver_signings enable row level security;

create policy "waiver_signings_select_own_or_admin" on waiver_signings
  for select using (auth.uid() = customer_id or is_admin());
create policy "waiver_signings_insert_own_or_admin" on waiver_signings
  for insert with check (auth.uid() = customer_id or is_admin());
