import type { CoatLength } from "./breeds";

export type DogWeightClass = "small" | "medium" | "large" | "xlarge";
export type CatWeightClass = "under20" | "over20";
export type DogServiceLevel = "bath" | "trim" | "haircut";
export type DogBookingService = DogServiceLevel | "puppyIntro";
export type CatServiceLevel = "bath" | "lightTrim";

const byCoat = (short: number, long: number) => ({ short, long });

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

const DOG_BATH: Record<DogWeightClass, { short: number; long: number }> = {
  small: byCoat(65, 75),
  medium: byCoat(75, 85),
  large: byCoat(85, 100),
  xlarge: byCoat(105, 120),
};

const DOG_TRIM: Record<DogWeightClass, { short: number; long: number }> = {
  small: byCoat(72, 80),
  medium: byCoat(82, 90),
  large: byCoat(92, 110),
  xlarge: byCoat(122, 135),
};

const DOG_HAIRCUT: Record<DogWeightClass, { short: number; long: number }> = {
  small: byCoat(85, 95),
  medium: byCoat(95, 105),
  large: byCoat(105, 120),
  xlarge: byCoat(135, 150),
};

const DOG_SERVICE_TABLES: Record<
  DogServiceLevel,
  Record<DogWeightClass, { short: number; long: number }>
> = {
  bath: DOG_BATH,
  trim: DOG_TRIM,
  haircut: DOG_HAIRCUT,
};

export const DOG_SERVICE_LABELS: Record<DogBookingService, string> = {
  bath: "Bath",
  trim: "Tidy Up (bath + trim)",
  haircut: "Full Groom (bath + haircut)",
  puppyIntro: "Puppy Intro to Grooming",
};

export const DOG_SERVICE_DESCRIPTIONS: Record<DogBookingService, string> = {
  bath: "Bath, 15-min brush-out, nail trim, ear cleaning. Anal gland expression, paw pad trim, and sanitary trim available upon request.",
  trim: "All Bath inclusions, plus a face, feet, and sanitary trim.",
  haircut:
    "All Bath inclusions, plus a full body contour or breed-standard cut.",
  puppyIntro:
    "A gentle, low-stress first grooming experience — introduces your puppy to the tub, dryer, and table with lots of positive reinforcement and short breaks. Puppies only.",
};

// Puppies under 6 months are priced by absolute weight, not the adult classes.
type PuppyWeightBand = "under5" | "under10" | "under20" | "over20";

export const PUPPY_WEIGHT_LABELS: Record<PuppyWeightBand, string> = {
  under5: "Under 5 lb",
  under10: "Under 10 lb",
  under20: "Under 20 lb",
  over20: "20 lb+",
};

export function puppyWeightBand(weightLb: number): PuppyWeightBand {
  if (weightLb < 5) return "under5";
  if (weightLb < 10) return "under10";
  if (weightLb < 20) return "under20";
  return "over20";
}

const PUPPY_BATH: Record<PuppyWeightBand, number> = {
  under5: 35,
  under10: 45,
  under20: 50,
  over20: 60,
};

const PUPPY_TRIM: Record<PuppyWeightBand, number> = {
  under5: 42,
  under10: 52,
  under20: 57,
  over20: 67,
};

const PUPPY_HAIRCUT: Record<PuppyWeightBand, number> = {
  under5: 50,
  under10: 60,
  under20: 65,
  over20: 75,
};

const PUPPY_SERVICE_TABLES: Record<DogServiceLevel, Record<PuppyWeightBand, number>> = {
  bath: PUPPY_BATH,
  trim: PUPPY_TRIM,
  haircut: PUPPY_HAIRCUT,
};

export const PUPPY_INTRO_PRICE = 25;

export const DESHED_FEE = 15;
export const DOODLE_COAT_MAINTENANCE_FEE = 10;

export interface DogPriceInput {
  weightLb: number;
  coat: CoatLength;
  service: DogBookingService;
  isPuppy: boolean;
  isDoodle: boolean;
  deshed: boolean;
}

export interface PriceBreakdownLine {
  label: string;
  amount: number;
}

export interface PriceResult {
  total: number;
  lines: PriceBreakdownLine[];
}

export function calculateDogPrice(input: DogPriceInput): PriceResult {
  const lines: PriceBreakdownLine[] = [];

  // Defensive: the flat intro rate only applies to pets actually flagged as
  // puppies — otherwise fall back to pricing it as a standard bath.
  if (input.service === "puppyIntro" && input.isPuppy) {
    lines.push({
      label: "Puppy Intro to Grooming",
      amount: PUPPY_INTRO_PRICE,
    });
    if (input.deshed) {
      lines.push({ label: "De-shed treatment", amount: DESHED_FEE });
    }
    const total = lines.reduce((sum, l) => sum + l.amount, 0);
    return { total, lines };
  }

  const service: DogServiceLevel =
    input.service === "puppyIntro" ? "bath" : input.service;

  if (input.isPuppy) {
    const band = puppyWeightBand(input.weightLb);
    const base = PUPPY_SERVICE_TABLES[service][band];
    lines.push({
      label: `Puppy ${DOG_SERVICE_LABELS[service]} (${PUPPY_WEIGHT_LABELS[band]})`,
      amount: base,
    });
  } else {
    const weightClass = dogWeightClass(input.weightLb);
    const base = DOG_SERVICE_TABLES[service][weightClass][input.coat];
    lines.push({
      label: `${DOG_SERVICE_LABELS[service]} (${DOG_WEIGHT_LABELS[weightClass]})`,
      amount: base,
    });

    if (
      input.isDoodle &&
      (weightClass === "medium" || weightClass === "large")
    ) {
      lines.push({
        label: "Doodle coat maintenance fee",
        amount: DOODLE_COAT_MAINTENANCE_FEE,
      });
    }
  }

  if (input.deshed) {
    lines.push({ label: "De-shed treatment", amount: DESHED_FEE });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { total, lines };
}

const CAT_BATH: Record<CatWeightClass, { short: number; long: number }> = {
  under20: byCoat(115, 135),
  over20: byCoat(130, 145),
};

const CAT_LIGHT_TRIM: Record<CatWeightClass, { short: number; long: number }> = {
  under20: byCoat(125, 140),
  over20: byCoat(135, 150),
};

const CAT_WATERLESS_BATH: Record<CatWeightClass, { short: number; long: number }> = {
  under20: byCoat(105, 125),
  over20: byCoat(115, 135),
};

const CAT_WATERLESS_LIGHT_TRIM: Record<CatWeightClass, { short: number; long: number }> = {
  under20: byCoat(115, 130),
  over20: byCoat(125, 140),
};

export const CAT_SERVICE_LABELS: Record<CatServiceLevel, string> = {
  bath: "Bath",
  lightTrim: "Light Tidy (bath + paw pad shave + sanitary trim)",
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
};

export interface CatPriceInput {
  weightLb: number;
  coat: CoatLength;
  service: CatServiceLevel;
  waterless: boolean;
  deshed: boolean;
}

export function calculateCatPrice(input: CatPriceInput): PriceResult {
  const lines: PriceBreakdownLine[] = [];
  const weightClass = catWeightClass(input.weightLb);

  const table = input.waterless
    ? input.service === "bath"
      ? CAT_WATERLESS_BATH
      : CAT_WATERLESS_LIGHT_TRIM
    : input.service === "bath"
      ? CAT_BATH
      : CAT_LIGHT_TRIM;

  const base = table[weightClass][input.coat];
  const weightLabel = weightClass === "over20" ? "over 20 lb" : "under 20 lb";
  lines.push({
    label: `${input.waterless ? "Waterless " : ""}${CAT_SERVICE_LABELS[input.service]} (${weightLabel})`,
    amount: base,
  });

  if (input.deshed) {
    lines.push({ label: "De-shed treatment", amount: DESHED_FEE });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { total, lines };
}

export interface AddOn {
  name: string;
  price: number;
}

export const DOG_ADD_ONS: AddOn[] = [
  { name: "Bow or bandana", price: 5 },
  { name: "Paw + nose balm", price: 10 },
  { name: "Ear cleaning", price: 10 },
  { name: "Ear plucking", price: 12 },
  { name: "Deep coat conditioner", price: 12 },
  { name: "Paw pad shave", price: 15 },
  { name: "Bow + braids", price: 15 },
  { name: "De-matting (15 min)", price: 15 },
  { name: "De-matting (30 min)", price: 30 },
  { name: "Extra brushing (15 min)", price: 15 },
  { name: "Extra brushing (30 min)", price: 30 },
  { name: "Extra scissoring (15 min)", price: 15 },
  { name: "Extra scissoring (30 min)", price: 30 },
  { name: "Nail polish", price: 17 },
  { name: "Teeth brushing", price: 19 },
  { name: "Anal glands", price: 20 },
  { name: "Flea bath", price: 20 },
  { name: "Nail trim", price: 22 },
  { name: "Sanitary shave", price: 20 },
  { name: "Nail grinding", price: 30 },
];

export const CAT_ADD_ONS: AddOn[] = [
  { name: "Ear cleaning", price: 15 },
  { name: "Paw pad shave", price: 15 },
  { name: "Sanitary trim", price: 20 },
  { name: "De-matting (15 min)", price: 15 },
  { name: "De-matting (30 min)", price: 30 },
  { name: "Extra brushing (15 min)", price: 15 },
  { name: "Extra brushing (30 min)", price: 30 },
  { name: "Extra scissoring (15 min)", price: 15 },
  { name: "Extra scissoring (30 min)", price: 30 },
  { name: "Nail trim", price: 25 },
];

export type PackageTier = "freshStart" | "pampered" | "vip";

export const PACKAGE_LABELS: Record<PackageTier, string> = {
  freshStart: "Fresh Start / Refresh",
  pampered: "Pampered / Indulge",
  vip: "VIP Treatment / Prestige",
};

export const PACKAGE_DESCRIPTIONS: Record<PackageTier, string> = {
  freshStart:
    "Teeth brushing, cologne, bandana or bow, and a deep coat conditioner.",
  pampered: "Everything in Fresh Start, plus nail grinding.",
  vip: "Everything in Pampered, plus a paw & nose balm massage, VIP shampoo & conditioner, and a discount on your next visit.",
};

// Members get the same add-on bundles at a discount.
export const MEMBER_PACKAGE_PRICES: Record<PackageTier, number> = {
  freshStart: 15,
  pampered: 20,
  vip: 25,
};

export const PACKAGE_PRICES: Record<PackageTier, number> = {
  freshStart: 25,
  pampered: 30,
  vip: 35,
};

export type CreativeTier = "accentPop" | "showstopper" | "fantasy";

export const CREATIVE_TIER_LABELS: Record<CreativeTier, string> = {
  accentPop: "Accent / Color Pop",
  showstopper: "Showstopper / Mini Makeover",
  fantasy: "Fantasy / Full Transformation",
};

export function calculateCreativePrice(
  tier: CreativeTier,
  weightLb: number,
): number {
  if (tier === "accentPop") return 40;
  if (tier === "showstopper") return 100;
  // fantasy: priced by weight
  if (weightLb <= 15) return 115;
  if (weightLb <= 40) return 150;
  return 250;
}

// Monthly memberships — dogs only, matching the three core service levels.
export type MembershipTier = "spaPup" | "royalPup" | "couturePup";

export const MEMBERSHIP_TIER_LABELS: Record<MembershipTier, string> = {
  spaPup: "Spa Pup",
  royalPup: "Royal Pup",
  couturePup: "Couture Pup",
};

export const MEMBERSHIP_TIER_SERVICE: Record<MembershipTier, DogServiceLevel> = {
  spaPup: "bath",
  royalPup: "trim",
  couturePup: "haircut",
};

// Members get their monthly groom at a discount off the regular à la carte
// price for that same service/weight/coat.
export const MEMBERSHIP_GROOM_DISCOUNT = 0.1;

export function applyMembershipDiscount(price: number): number {
  return Math.round(price * (1 - MEMBERSHIP_GROOM_DISCOUNT) * 100) / 100;
}

export const MEMBERSHIP_TIER_DESCRIPTIONS: Record<MembershipTier, string> = {
  spaPup:
    "Monthly Bath + Brush at 10% off, priority booking, discounted add-ons.",
  royalPup:
    "Monthly Bath + Trim at 10% off, priority booking, discounted add-ons.",
  couturePup:
    "Monthly Bath + Full Haircut at 10% off, priority booking, discounted add-ons.",
};

// After this many months subscribed, the next month is free.
export const MEMBERSHIP_FREE_MONTH_THRESHOLD: Record<MembershipTier, number> = {
  spaPup: 3,
  royalPup: 4,
  couturePup: 5,
};

export function monthsSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return (
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  );
}
