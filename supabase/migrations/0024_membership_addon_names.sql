-- Lets a membership also include one or more individual (non-bundled)
-- add-ons, selected at signup alongside the optional bundle.
alter table memberships
  add column if not exists addon_names text[] not null default '{}';
