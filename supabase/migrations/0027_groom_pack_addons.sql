-- Lets a groom credit pack purchase also include a one-time bundle and/or
-- individual add-ons, recorded alongside the pack for reference.
alter table groom_credit_packs
  add column if not exists addon_bundle text,
  add column if not exists addon_names text[] not null default '{}';
