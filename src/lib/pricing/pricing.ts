import type { CoatLength } from "./breeds";
import { daysUntil } from "../promotions/helpers";

// Promotions (name, discount %, date range, usage cap, appointment
// lead-time rule) are managed as a list in the `promotions` table — see
// src/lib/promotions/ — rather than as part of this static pricing config.
// This is a plain, pure discount calculator any promotion can use.
export function applyDiscount(price: number, discountPercent: number): number {
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}

// Texas taxes dog/cat grooming as a service (Comptroller Rule 3.292).
// Fixed rate, not admin-editable — update here if the registered
// jurisdiction's combined rate ever changes.
export const SALES_TAX_PERCENT = 8.25;

export function calculateSalesTax(price: number): number {
  return Math.round(price * (SALES_TAX_PERCENT / 100) * 100) / 100;
}

export type DogWeightClass = "small" | "medium" | "large" | "xlarge";
export type CatWeightClass = "under20" | "over20";
export type DogServiceLevel = "bath" | "trim" | "haircut";
export type DogBookingService = DogServiceLevel | "puppyIntro";
export type CatServiceLevel = "bath" | "lightTrim" | "fleaBath" | "fleaBathTidy";
export type PuppyWeightBand = "under5" | "under10" | "under20" | "over20";

export const DOG_WEIGHT_LABELS: Record<DogWeightClass, string> = {
  small: "Small (1–10 lb)",
  medium: "Medium (10–30 lb)",
  large: "Large (30–75 lb)",
  xlarge: "Extra Large (75+ lb)",
};

export function dogWeightClass(weightLb: number): DogWeightClass {
  if (weightLb <= 10) return "small";
  if (weightLb <= 30) return "medium";
  if (weightLb <= 75) return "large";
  return "xlarge";
}

export function catWeightClass(weightLb: number): CatWeightClass {
  return weightLb > 20 ? "over20" : "under20";
}

export const DOG_SERVICE_LABELS: Record<DogBookingService, string> = {
  bath: "Bath",
  trim: "Tidy Up (bath + trim)",
  haircut: "Full Groom (bath + haircut)",
  puppyIntro: "Puppy Intro to Grooming",
};

export const DOG_SERVICE_DESCRIPTIONS: Record<DogBookingService, string> = {
  bath: "Bath, 15-min brush-out, nail trim, ear cleaning, and cologne. Anal gland expression, paw pad trim, and sanitary trim available upon request.",
  trim: "All Bath inclusions, plus a face, feet, and sanitary trim.",
  haircut:
    "All Bath inclusions, plus a full body contour or breed-standard cut.",
  puppyIntro:
    "A gentle, low-stress first grooming experience. Introduces your puppy to the tub, dryer, and table with lots of positive reinforcement and short breaks. Puppies only.",
};

export const PUPPY_WEIGHT_LABELS: Record<PuppyWeightBand, string> = {
  under5: "Under 5 lb",
  under10: "Under 10 lb",
  under20: "Under 20 lb",
  over20: "20 lb+",
};

// Puppies under 6 months are priced by absolute weight, not the adult classes.
export function puppyWeightBand(weightLb: number): PuppyWeightBand {
  if (weightLb < 5) return "under5";
  if (weightLb < 10) return "under10";
  if (weightLb < 20) return "under20";
  return "over20";
}

export interface DogPriceInput {
  weightLb: number;
  coat: CoatLength;
  service: DogBookingService;
  isPuppy: boolean;
  deshed: boolean;
  isDoodleMix: boolean;
}

export interface PriceBreakdownLine {
  label: string;
  amount: number;
}

export interface PriceResult {
  total: number;
  lines: PriceBreakdownLine[];
}

export function calculateDogPrice(
  input: DogPriceInput,
  config: PricingConfig,
): PriceResult {
  const lines: PriceBreakdownLine[] = [];

  // Defensive: the flat intro rate only applies to pets actually flagged as
  // puppies — otherwise fall back to pricing it as a standard bath.
  if (input.service === "puppyIntro" && input.isPuppy) {
    lines.push({
      label: "Puppy Intro to Grooming",
      amount: config.puppy.introPrice,
    });
    if (input.deshed) {
      lines.push({ label: "De-shed treatment", amount: config.flatFees.deshed });
    }
    const total = lines.reduce((sum, l) => sum + l.amount, 0);
    return { total, lines };
  }

  const service: DogServiceLevel =
    input.service === "puppyIntro" ? "bath" : input.service;

  if (input.isPuppy) {
    const band = puppyWeightBand(input.weightLb);
    const base = config.puppy[service][band];
    lines.push({
      label: `Puppy ${DOG_SERVICE_LABELS[service]} (${PUPPY_WEIGHT_LABELS[band]})`,
      amount: base,
    });
  } else if (input.isDoodleMix && input.weightLb >= 45) {
    const doodleRates: Record<DogServiceLevel, number> = {
      bath: config.doodleMix.bath45Plus,
      trim: config.doodleMix.trim45Plus,
      haircut: config.doodleMix.haircut45Plus,
    };
    lines.push({
      label: `Standard Doodle Mix ${DOG_SERVICE_LABELS[service]} (45+ lb)`,
      amount: doodleRates[service],
    });
  } else {
    const weightClass = dogWeightClass(input.weightLb);
    const base = config.dog[service][weightClass][input.coat];
    lines.push({
      label: `${DOG_SERVICE_LABELS[service]} (${DOG_WEIGHT_LABELS[weightClass]})`,
      amount: base,
    });
  }

  if (input.deshed) {
    lines.push({ label: "De-shed treatment", amount: config.flatFees.deshed });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { total, lines };
}

export const CAT_SERVICE_LABELS: Record<CatServiceLevel, string> = {
  bath: "Bath",
  lightTrim: "Bath & Tidy",
  fleaBath: "Flea Bath",
  fleaBathTidy: "Flea Bath & Tidy",
};

const SERVICE_LABELS: Record<string, string> = {
  ...DOG_SERVICE_LABELS,
  ...CAT_SERVICE_LABELS,
  standalone: "Standalone Add-On Visit",
};

// Appointments store the raw internal key (e.g. "bath", "puppyIntro") — use
// this wherever a service needs to be shown to a person.
export function formatServiceLabel(service: string): string {
  return SERVICE_LABELS[service] ?? service;
}

export const CAT_SERVICE_DESCRIPTIONS: Record<CatServiceLevel, string> = {
  bath: "Water bath, 15-min brushing, nail clipping, ear cleaning, blow-out.",
  lightTrim: "All Bath inclusions, plus a paw pad shave and sanitary trim.",
  fleaBath: "A flea treatment bath and rinse to eliminate fleas and soothe irritated skin. Flat rate, any size or coat.",
  fleaBathTidy: "All Flea Bath inclusions, plus a paw pad shave and sanitary trim. Flat rate, any size or coat.",
};

export interface CatPriceInput {
  weightLb: number;
  coat: CoatLength;
  service: CatServiceLevel;
  waterless: boolean;
  deshed: boolean;
  isKitten: boolean;
}

export function calculateCatPrice(
  input: CatPriceInput,
  config: PricingConfig,
): PriceResult {
  const lines: PriceBreakdownLine[] = [];

  // Flat rate by service, no weight/coat table — kittens don't vary in
  // size nearly as much as puppy breeds do, so a weight-banded matrix
  // (like puppies get) isn't worth the added complexity.
  if (input.isKitten) {
    lines.push({
      label: `Kitten ${CAT_SERVICE_LABELS[input.service]}`,
      amount: config.cat.kitten[input.service],
    });
    if (input.deshed) {
      lines.push({ label: "De-shed treatment", amount: config.flatFees.deshed });
    }
    return { total: lines.reduce((sum, l) => sum + l.amount, 0), lines };
  }

  // Flat rate, no weight/coat table lookup — unlike bath and lightTrim.
  if (input.service === "fleaBath" || input.service === "fleaBathTidy") {
    lines.push({
      label: CAT_SERVICE_LABELS[input.service],
      amount: config.cat[input.service],
    });
    if (input.deshed) {
      lines.push({ label: "De-shed treatment", amount: config.flatFees.deshed });
    }
    return { total: lines.reduce((sum, l) => sum + l.amount, 0), lines };
  }

  const weightClass = catWeightClass(input.weightLb);

  const table = input.waterless
    ? input.service === "bath"
      ? config.cat.waterlessBath
      : config.cat.waterlessLightTrim
    : input.service === "bath"
      ? config.cat.bath
      : config.cat.lightTrim;

  const base = table[weightClass][input.coat];
  const weightLabel = weightClass === "over20" ? "over 20 lb" : "under 20 lb";
  lines.push({
    label: `${input.waterless ? "Waterless " : ""}${CAT_SERVICE_LABELS[input.service]} (${weightLabel})`,
    amount: base,
  });

  if (input.deshed) {
    lines.push({ label: "De-shed treatment", amount: config.flatFees.deshed });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { total, lines };
}

export interface AddOn {
  name: string;
  price: number;
}

// Add-on names are fixed — only their prices are editable (via
// pricing_config.addOns.dog/.cat, matched positionally against these
// arrays). Adding/removing/renaming an add-on is still a code change.
export const DOG_ADD_ON_NAMES: string[] = [
  "Bow or bandana",
  "Paw + nose balm",
  "Ear cleaning",
  "Ear plucking",
  "Deep coat conditioner",
  "Paw pad shave",
  "Bow + braids",
  "De-matting (15 min)",
  "Extra brushing (15 min)",
  "Extra scissoring (15 min)",
  "Nail polish",
  "Teeth brushing",
  "Anal glands",
  "Flea bath",
  "Sanitary shave",
  "Nail trim",
  "De-matting (30 min)",
  "Extra brushing (30 min)",
  "Extra scissoring (30 min)",
  "Nail grinding",
];

export const CAT_ADD_ON_NAMES: string[] = [
  "Ear cleaning",
  "Paw pad shave",
  "De-matting (15 min)",
  "Extra brushing (15 min)",
  "Extra scissoring (15 min)",
  "Sanitary trim",
  "Nail trim",
  "De-matting (30 min)",
  "Extra brushing (30 min)",
  "Extra scissoring (30 min)",
  "Nail Caps (2 paws)",
  "Nail Caps (4 paws)",
];

// Already included free with any bath/trim/haircut — only worth listing as
// a paid add-on for a standalone visit that skips the base service entirely
// (e.g. a customer who just wants a nail trim, no bath).
export const DOG_ADD_ONS_INCLUDED_WITH_SERVICE = [
  "Ear cleaning",
  "Paw pad shave",
  "Anal glands",
  "Sanitary shave",
  "Nail trim",
];

export const CAT_ADD_ONS_INCLUDED_WITH_SERVICE = [
  "Ear cleaning",
  "Paw pad shave",
  "Sanitary trim",
  "Nail trim",
];

export function dogAddOns(config: PricingConfig): AddOn[] {
  return DOG_ADD_ON_NAMES.map((name, i) => ({ name, price: config.addOns.dog[i] }));
}

export function catAddOns(config: PricingConfig): AddOn[] {
  return CAT_ADD_ON_NAMES.map((name, i) => ({ name, price: config.addOns.cat[i] }));
}

export type PackageTier = "freshStart" | "pampered" | "vip";

export const PACKAGE_LABELS: Record<PackageTier, string> = {
  freshStart: "Fresh Start / Refresh",
  pampered: "Pampered / Indulge",
  vip: "VIP Treatment / Prestige",
};

export const PACKAGE_DESCRIPTIONS: Record<PackageTier, string> = {
  freshStart:
    "Teeth brushing, bandana or bow, and a deep coat conditioner.",
  pampered: "Everything in Fresh Start, plus nail grinding.",
  vip: "Everything in Pampered, plus a paw & nose balm, massage, VIP shampoo & conditioner, and a discount on your next visit.",
};

export function applyMemberAddonDiscount(
  price: number,
  config: PricingConfig,
): number {
  return Math.round(price * (1 - config.memberAddonDiscountPercent / 100));
}

// Members get the same add-on bundles at the same discount rate.
export function memberPackagePrices(
  config: PricingConfig,
): Record<PackageTier, number> {
  return {
    freshStart: applyMemberAddonDiscount(config.packages.freshStart, config),
    pampered: applyMemberAddonDiscount(config.packages.pampered, config),
    vip: applyMemberAddonDiscount(config.packages.vip, config),
  };
}

export type CreativeTier = "accentPop" | "showstopper" | "fantasy";

export const CREATIVE_TIER_LABELS: Record<CreativeTier, string> = {
  accentPop: "Accent / Color Pop",
  showstopper: "Showstopper / Mini Makeover",
  fantasy: "Fantasy / Full Transformation",
};

export function calculateCreativePrice(
  tier: CreativeTier,
  weightLb: number,
  config: PricingConfig,
): number {
  if (tier === "accentPop") return config.creative.accentPop;
  if (tier === "showstopper") return config.creative.showstopper;
  // fantasy: priced by weight (breakpoints are structural, not editable)
  if (weightLb <= 15) return config.creative.fantasy.upTo15;
  if (weightLb <= 40) return config.creative.fantasy.upTo40;
  return config.creative.fantasy.over40;
}

// Monthly memberships — dogs only, matching the three core service levels.
export type MembershipTier = "spaPup" | "royalPup" | "couturePup";

export const MEMBERSHIP_TIER_LABELS: Record<MembershipTier, string> = {
  spaPup: "Bath",
  royalPup: "Bath & Tidy",
  couturePup: "Bath & Full Groom",
};

export const MEMBERSHIP_TIER_SERVICE: Record<MembershipTier, DogServiceLevel> = {
  spaPup: "bath",
  royalPup: "trim",
  couturePup: "haircut",
};

// One-time pre-purchased groom credit packs — priced at the pet's own Bath,
// Bath & Tidy, or Full Groom rate, credits never expire.
export type GroomPackService = "bath" | "trim" | "haircut";
export type GroomPackTier = "five" | "nine";

export const GROOM_PACK_SERVICES: GroomPackService[] = ["bath", "trim", "haircut"];

export const GROOM_PACK_SERVICE_LABELS: Record<GroomPackService, string> = {
  bath: "Bath",
  trim: "Bath & Tidy",
  haircut: "Full Groom",
};

export const GROOM_PACK_TIER_LABELS: Record<GroomPackTier, string> = {
  five: "Buy 5, Get 1 Free",
  nine: "Buy 9, Get 3 More Free",
};

export function monthsSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return (
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  );
}

// --- Editable pricing config --------------------------------------------
// Every number below is editable from /admin/pricing (backed by the
// pricing_config DB table). DEFAULT_PRICING_CONFIG is the fallback used if
// the DB read ever fails, and mirrors the exact values this app shipped
// with before the pricing editor existed, so nothing changes if the DB
// row is ever missing.

export interface WeightCoatPrice {
  short: number;
  long: number;
}

export interface PricingConfig {
  dog: {
    bath: Record<DogWeightClass, WeightCoatPrice>;
    trim: Record<DogWeightClass, WeightCoatPrice>;
    haircut: Record<DogWeightClass, WeightCoatPrice>;
  };
  puppy: {
    bath: Record<PuppyWeightBand, number>;
    trim: Record<PuppyWeightBand, number>;
    haircut: Record<PuppyWeightBand, number>;
    introPrice: number;
  };
  cat: {
    bath: Record<CatWeightClass, WeightCoatPrice>;
    lightTrim: Record<CatWeightClass, WeightCoatPrice>;
    waterlessBath: Record<CatWeightClass, WeightCoatPrice>;
    waterlessLightTrim: Record<CatWeightClass, WeightCoatPrice>;
    // Flat rate, unlike the other cat services — same price regardless of
    // weight or coat length.
    fleaBath: number;
    fleaBathTidy: number;
    // Flat rate per service for kittens — takes priority over everything
    // above (including the flea rates) whenever isKitten is true.
    kitten: Record<CatServiceLevel, number>;
  };
  flatFees: {
    deshed: number;
    pickupDropoff: number;
  };
  addOns: {
    dog: number[];
    cat: number[];
  };
  packages: Record<PackageTier, number>;
  memberAddonDiscountPercent: number;
  creative: {
    accentPop: number;
    showstopper: number;
    fantasy: { upTo15: number; upTo40: number; over40: number };
  };
  groomPacks: Record<GroomPackTier, { paidCount: number; freeCount: number }>;
  // Flat rates, not a full weight/coat matrix — standard-sized doodle
  // crosses (Goldendoodle, Labradoodle, etc., 45+ lb) get one price per
  // service regardless of coat length; smaller doodles stay on the
  // regular dog matrix.
  doodleMix: {
    bath45Plus: number;
    trim45Plus: number;
    haircut45Plus: number;
  };
  // A flat-dollar incentive for booking well ahead of time, independent of
  // the sitewide promotions system (which discounts booking *soon*, not
  // *in advance*). Applies automatically, no code needed.
  advanceBookingDiscount: {
    active: boolean;
    amount: number;
    minLeadWeeks: number;
  };
}

const byCoat = (short: number, long: number): WeightCoatPrice => ({ short, long });

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  dog: {
    bath: {
      small: byCoat(55, 65),
      medium: byCoat(65, 75),
      large: byCoat(75, 90),
      xlarge: byCoat(95, 110),
    },
    trim: {
      small: byCoat(62, 70),
      medium: byCoat(72, 80),
      large: byCoat(82, 100),
      xlarge: byCoat(112, 125),
    },
    haircut: {
      small: byCoat(75, 85),
      medium: byCoat(85, 95),
      large: byCoat(95, 110),
      xlarge: byCoat(125, 140),
    },
  },
  puppy: {
    bath: { under5: 25, under10: 35, under20: 40, over20: 50 },
    trim: { under5: 32, under10: 42, under20: 47, over20: 57 },
    haircut: { under5: 40, under10: 50, under20: 55, over20: 65 },
    introPrice: 25,
  },
  cat: {
    bath: { under20: byCoat(105, 125), over20: byCoat(120, 135) },
    lightTrim: { under20: byCoat(115, 130), over20: byCoat(125, 140) },
    waterlessBath: { under20: byCoat(95, 115), over20: byCoat(105, 125) },
    waterlessLightTrim: { under20: byCoat(105, 120), over20: byCoat(115, 130) },
    fleaBath: 100,
    fleaBathTidy: 115,
    kitten: { bath: 65, lightTrim: 75, fleaBath: 70, fleaBathTidy: 80 },
  },
  flatFees: { deshed: 15, pickupDropoff: 25 },
  addOns: {
    dog: [5, 10, 10, 12, 12, 15, 15, 15, 15, 15, 15, 19, 20, 20, 20, 22, 30, 30, 30, 30],
    cat: [15, 15, 15, 15, 15, 20, 25, 30, 30, 30, 35, 45],
  },
  packages: { freshStart: 25, pampered: 30, vip: 35 },
  memberAddonDiscountPercent: 15,
  creative: {
    accentPop: 40,
    showstopper: 100,
    fantasy: { upTo15: 115, upTo40: 150, over40: 250 },
  },
  groomPacks: {
    five: { paidCount: 5, freeCount: 1 },
    nine: { paidCount: 9, freeCount: 3 },
  },
  doodleMix: { bath45Plus: 70, trim45Plus: 85, haircut45Plus: 105 },
  advanceBookingDiscount: { active: true, amount: 5, minLeadWeeks: 4 },
};

// Single source of truth for whether a booking qualifies for the advance
// booking discount, shared by both the client (for display) and the server
// (for the actual charge) so they can never disagree.
export function advanceBookingDiscountAmount(
  config: PricingConfig,
  dateStr: string,
): number {
  if (!config.advanceBookingDiscount.active || !dateStr) return 0;
  if (daysUntil(dateStr) < config.advanceBookingDiscount.minLeadWeeks * 7) return 0;
  return config.advanceBookingDiscount.amount;
}
