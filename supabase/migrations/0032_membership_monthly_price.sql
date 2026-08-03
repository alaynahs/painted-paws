-- Stores the actual monthly price a membership was signed up at, so it's
-- readable from our own DB without round-tripping to Stripe, and so it
-- never drifts if pricing_config changes later. Set once at signup
-- (joinMembership / adminCreateMembership) and never recomputed afterward
-- — same locked-in-at-purchase behavior as groom_credit_packs.unit_price.
-- Nullable: memberships created before this migration have no recorded
-- value and are intentionally left as NULL rather than guessed/backfilled.
alter table memberships add column if not exists monthly_price numeric;
