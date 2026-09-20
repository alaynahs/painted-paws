-- Entries for the "6 free grooms" giveaway — public form, no login
-- required, so inserts go through the service-role client (see
-- src/app/giveaway/actions.ts) rather than a public RLS insert policy.
-- Only the admin can ever read entries back.
create table giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  pet_name text not null,
  breed text not null,
  zip_code text not null,
  promo_opt_out boolean not null default false,
  created_at timestamptz not null default now()
);

create index giveaway_entries_created_idx on giveaway_entries (created_at desc);

alter table giveaway_entries enable row level security;

create policy "giveaway_entries_admin_select" on giveaway_entries
  for select using (is_admin());
