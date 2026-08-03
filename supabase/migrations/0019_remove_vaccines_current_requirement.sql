-- The "is your pet current on vaccinations" self-report question was removed
-- from the waiver — rabies proof is already verified separately via the
-- pet's uploaded vaccine record (rabies_expires_at). Column kept for
-- historical rows, just no longer required going forward.

alter table waiver_signings alter column vaccines_current drop not null;
