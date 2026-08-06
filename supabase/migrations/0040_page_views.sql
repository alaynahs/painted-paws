-- General "what page were they last on" tracking, site-wide, for logged-in
-- customers only. Separate from booking_funnel_events (which only tracks a
-- few specific booking-flow checkpoints) — this logs every page visit.
create table page_views (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

create index page_views_customer_idx on page_views (customer_id, created_at desc);

alter table page_views enable row level security;

create policy "page_views_insert_own" on page_views
  for insert with check (auth.uid() = customer_id);

create policy "page_views_select_admin" on page_views
  for select using (is_admin());
