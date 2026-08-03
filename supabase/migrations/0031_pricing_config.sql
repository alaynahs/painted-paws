-- Single-row "site settings" table holding every editable price on the
-- site, as one JSONB blob (see PricingConfig in src/lib/pricing/pricing.ts
-- for the shape). Lets the admin edit pricing through /admin/pricing
-- instead of requiring a code change + redeploy for every price update.
-- Seeded with the exact values that were previously hardcoded in
-- pricing.ts, so day one of this feature changes nothing for real users.

create table pricing_config (
  id int primary key default 1,
  config jsonb not null,
  updated_at timestamptz not null default now(),
  constraint pricing_config_singleton check (id = 1)
);

alter table pricing_config enable row level security;

create policy "pricing_config_select_all" on pricing_config
  for select using (true);
create policy "pricing_config_admin_write" on pricing_config
  for all using (is_admin()) with check (is_admin());

insert into pricing_config (id, config) values (1, '{
  "dog": {
    "bath":    {"small":{"short":55,"long":65},"medium":{"short":65,"long":75},"large":{"short":75,"long":90},"xlarge":{"short":95,"long":110}},
    "trim":    {"small":{"short":62,"long":70},"medium":{"short":72,"long":80},"large":{"short":82,"long":100},"xlarge":{"short":112,"long":125}},
    "haircut": {"small":{"short":75,"long":85},"medium":{"short":85,"long":95},"large":{"short":95,"long":110},"xlarge":{"short":125,"long":140}}
  },
  "puppy": {
    "bath":    {"under5":25,"under10":35,"under20":40,"over20":50},
    "trim":    {"under5":32,"under10":42,"under20":47,"over20":57},
    "haircut": {"under5":40,"under10":50,"under20":55,"over20":65},
    "introPrice": 25
  },
  "cat": {
    "bath":              {"under20":{"short":105,"long":125},"over20":{"short":120,"long":135}},
    "lightTrim":         {"under20":{"short":115,"long":130},"over20":{"short":125,"long":140}},
    "waterlessBath":      {"under20":{"short":95,"long":115},"over20":{"short":105,"long":125}},
    "waterlessLightTrim": {"under20":{"short":105,"long":120},"over20":{"short":115,"long":130}}
  },
  "flatFees": {"deshed":15,"doodleCoatMaintenance":10,"pickupDropoff":25},
  "addOns": {
    "dog": [5,10,10,12,12,15,15,15,15,15,15,19,20,20,20,22,30,30,30,30],
    "cat": [15,15,15,15,15,20,25,30,30,30,35,45]
  },
  "packages": {"freshStart":25,"pampered":30,"vip":35},
  "memberAddonDiscountPercent": 15,
  "creative": {"accentPop":40,"showstopper":100,"fantasy":{"upTo15":115,"upTo40":150,"over40":250}},
  "groomPacks": {"five":{"paidCount":5,"freeCount":1},"nine":{"paidCount":9,"freeCount":3}},
  "promo": {"active":true,"discountPercent":50,"maxUses":10}
}'::jsonb)
on conflict (id) do nothing;
