-- Adds Bath & Tidy (trim) as a third groom credit pack option, alongside
-- the existing Bath and Full Groom packs.

alter table groom_credit_packs drop constraint groom_credit_packs_service_check;
alter table groom_credit_packs add constraint groom_credit_packs_service_check
  check (service in ('bath', 'trim', 'haircut'));
