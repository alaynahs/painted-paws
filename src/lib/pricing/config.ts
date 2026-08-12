import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PRICING_CONFIG, type PricingConfig } from "./pricing";

// Fills in any field missing from a stored config row with today's default
// — future-proofs against adding new config fields without an immediate
// re-seed, and protects against a partially-written row.
function mergeWithDefaults(
  partial: Partial<PricingConfig> | null | undefined,
): PricingConfig {
  const d = DEFAULT_PRICING_CONFIG;
  if (!partial) return d;
  return {
    dog: { ...d.dog, ...partial.dog },
    puppy: { ...d.puppy, ...partial.puppy },
    cat: { ...d.cat, ...partial.cat },
    flatFees: { ...d.flatFees, ...partial.flatFees },
    addOns: { ...d.addOns, ...partial.addOns },
    packages: { ...d.packages, ...partial.packages },
    memberAddonDiscountPercent:
      partial.memberAddonDiscountPercent ?? d.memberAddonDiscountPercent,
    creative: {
      ...d.creative,
      ...partial.creative,
      fantasy: { ...d.creative.fantasy, ...partial.creative?.fantasy },
    },
    groomPacks: { ...d.groomPacks, ...partial.groomPacks },
    doodleMix: { ...d.doodleMix, ...partial.doodleMix },
    advanceBookingDiscount: {
      ...d.advanceBookingDiscount,
      ...partial.advanceBookingDiscount,
    },
  };
}

// Cached per-request (React's cache(), not a cross-request cache) so many
// call sites during one page render only hit the DB once, while every new
// request/action always sees the latest saved pricing — no manual
// invalidation needed after an admin edit.
export const getPricingConfig = cache(async (): Promise<PricingConfig> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pricing_config")
      .select("config")
      .eq("id", 1)
      .single();
    if (error || !data?.config) return DEFAULT_PRICING_CONFIG;
    return mergeWithDefaults(data.config as Partial<PricingConfig>);
  } catch {
    return DEFAULT_PRICING_CONFIG;
  }
});
