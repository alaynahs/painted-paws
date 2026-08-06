-- Lets logged-out visitors show up in analytics too, via a random
-- cookie-based visitor_id instead of a real customer_id. A row must have
-- one or the other. Anonymous rows can never be tied to a real person, so
-- they can't be excluded by name the way the owner's own accounts are.
alter table booking_funnel_events alter column customer_id drop not null;
alter table booking_funnel_events add column visitor_id text;
alter table booking_funnel_events add constraint booking_funnel_events_has_identity
  check (customer_id is not null or visitor_id is not null);

drop policy if exists "booking_funnel_events_insert_own" on booking_funnel_events;
create policy "booking_funnel_events_insert_own_or_anon" on booking_funnel_events
  for insert with check (
    (auth.uid() = customer_id) or (customer_id is null and visitor_id is not null)
  );

alter table site_session_durations alter column customer_id drop not null;
alter table site_session_durations add column visitor_id text;
alter table site_session_durations add constraint site_session_durations_has_identity
  check (customer_id is not null or visitor_id is not null);

drop policy if exists "site_session_durations_insert_own" on site_session_durations;
create policy "site_session_durations_insert_own_or_anon" on site_session_durations
  for insert with check (
    (auth.uid() = customer_id) or (customer_id is null and visitor_id is not null)
  );

alter table page_views alter column customer_id drop not null;
alter table page_views add column visitor_id text;
alter table page_views add constraint page_views_has_identity
  check (customer_id is not null or visitor_id is not null);

drop policy if exists "page_views_insert_own" on page_views;
create policy "page_views_insert_own_or_anon" on page_views
  for insert with check (
    (auth.uid() = customer_id) or (customer_id is null and visitor_id is not null)
  );
