-- Lets the admin write custom banner copy per promotion (e.g. "Use code
-- PAWS for 20% off!") instead of always showing the generated
-- "Limited-Time Offer: X% Off Any Groom" text.
alter table promotions add column if not exists banner_message text;

-- Deleting a promotion used by real appointments previously failed outright
-- (blocked by the default FK behavior) with no clear error shown to the
-- admin — the delete silently no-op'd while the page reported success.
-- Switching to ON DELETE SET NULL lets old appointments just lose their
-- promo reference (their stored price/discount already reflects what was
-- actually charged) instead of blocking cleanup of an old promotion.
do $$
declare
  fk_name text;
begin
  select c.conname into fk_name
  from pg_constraint c
  where c.conrelid = 'appointments'::regclass
    and c.contype = 'f'
    and c.confrelid = 'promotions'::regclass;

  if fk_name is not null then
    execute format('alter table appointments drop constraint %I', fk_name);
  end if;

  alter table appointments
    add constraint appointments_promo_id_fkey
    foreign key (promo_id) references promotions (id) on delete set null;
end $$;
