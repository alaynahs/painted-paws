"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin";
import { getPricingConfig } from "@/lib/pricing/config";
import {
  DOG_ADD_ON_NAMES,
  CAT_ADD_ON_NAMES,
  type PricingConfig,
  type DogWeightClass,
  type PuppyWeightBand,
} from "@/lib/pricing/pricing";

function num(formData: FormData, key: string): number {
  return Number(formData.get(key) ?? 0);
}

const DOG_WEIGHT_CLASSES: DogWeightClass[] = ["small", "medium", "large", "xlarge"];
const PUPPY_BANDS: PuppyWeightBand[] = ["under5", "under10", "under20", "over20"];

// Every section below reads the CURRENT config, patches only its own
// top-level key(s), and writes the whole object back — so two admins (or
// two browser tabs) saving different sections can never clobber each
// other's changes, even though the whole config lives in one JSON column.
async function saveConfigPatch(patch: (config: PricingConfig) => PricingConfig) {
  const { supabase } = await requireAdmin();
  const current = await getPricingConfig();
  const next = patch(current);
  await supabase
    .from("pricing_config")
    .update({ config: next, updated_at: new Date().toISOString() })
    .eq("id", 1);
  revalidatePath("/admin/pricing");
  revalidatePath("/book");
  revalidatePath("/membership");
  revalidatePath("/");
}

export async function updateDogMatrix(formData: FormData) {
  const readTable = (service: "bath" | "trim" | "haircut") =>
    Object.fromEntries(
      DOG_WEIGHT_CLASSES.map((wc) => [
        wc,
        {
          short: num(formData, `dog-${service}-${wc}-short`),
          long: num(formData, `dog-${service}-${wc}-long`),
        },
      ]),
    ) as Record<DogWeightClass, { short: number; long: number }>;

  await saveConfigPatch((c) => ({
    ...c,
    dog: {
      bath: readTable("bath"),
      trim: readTable("trim"),
      haircut: readTable("haircut"),
    },
  }));
  redirect("/admin/pricing?saved=dog");
}

export async function updatePuppyPricing(formData: FormData) {
  const readBand = (service: "bath" | "trim" | "haircut") =>
    Object.fromEntries(
      PUPPY_BANDS.map((b) => [b, num(formData, `puppy-${service}-${b}`)]),
    ) as Record<PuppyWeightBand, number>;

  await saveConfigPatch((c) => ({
    ...c,
    puppy: {
      bath: readBand("bath"),
      trim: readBand("trim"),
      haircut: readBand("haircut"),
      introPrice: num(formData, "puppy-introPrice"),
    },
  }));
  redirect("/admin/pricing?saved=puppy");
}

export async function updateCatMatrix(formData: FormData) {
  const readCoat = (service: "bath" | "lightTrim" | "waterlessBath" | "waterlessLightTrim") => ({
    short: num(formData, `cat-${service}-short`),
    long: num(formData, `cat-${service}-long`),
  });

  await saveConfigPatch((c) => ({
    ...c,
    cat: {
      bath: readCoat("bath"),
      lightTrim: readCoat("lightTrim"),
      waterlessBath: readCoat("waterlessBath"),
      waterlessLightTrim: readCoat("waterlessLightTrim"),
      fleaBath: num(formData, "cat-fleaBath"),
      fleaBathTidy: num(formData, "cat-fleaBathTidy"),
      kitten: {
        bath: num(formData, "cat-kitten-bath"),
        lightTrim: num(formData, "cat-kitten-lightTrim"),
        fleaBath: num(formData, "cat-kitten-fleaBath"),
        fleaBathTidy: num(formData, "cat-kitten-fleaBathTidy"),
        waterlessBath: num(formData, "cat-kitten-waterlessBath"),
        waterlessLightTrim: num(formData, "cat-kitten-waterlessLightTrim"),
      },
    },
  }));
  redirect("/admin/pricing?saved=cat");
}

export async function updateFlatFees(formData: FormData) {
  await saveConfigPatch((c) => ({
    ...c,
    flatFees: {
      deshed: num(formData, "flatFee-deshed"),
      pickupDropoff: num(formData, "flatFee-pickupDropoff"),
    },
  }));
  redirect("/admin/pricing?saved=fees");
}

export async function updateAdvanceBookingDiscount(formData: FormData) {
  await saveConfigPatch((c) => ({
    ...c,
    advanceBookingDiscount: {
      active: formData.get("advanceBookingDiscount-active") === "true",
      amount: num(formData, "advanceBookingDiscount-amount"),
      minLeadWeeks: num(formData, "advanceBookingDiscount-minLeadWeeks"),
    },
  }));
  redirect("/admin/pricing?saved=advanceBookingDiscount");
}

export async function updateDoodleMixPricing(formData: FormData) {
  await saveConfigPatch((c) => ({
    ...c,
    doodleMix: {
      bath45Plus: num(formData, "doodleMix-bath45Plus"),
      trim45Plus: num(formData, "doodleMix-trim45Plus"),
      haircut45Plus: num(formData, "doodleMix-haircut45Plus"),
    },
  }));
  redirect("/admin/pricing?saved=doodleMix");
}

export async function updateDogAddOns(formData: FormData) {
  const prices = DOG_ADD_ON_NAMES.map((_, i) => num(formData, `addon-dog-${i}`));
  await saveConfigPatch((c) => ({ ...c, addOns: { ...c.addOns, dog: prices } }));
  redirect("/admin/pricing?saved=dogAddOns");
}

export async function updateCatAddOns(formData: FormData) {
  const prices = CAT_ADD_ON_NAMES.map((_, i) => num(formData, `addon-cat-${i}`));
  await saveConfigPatch((c) => ({ ...c, addOns: { ...c.addOns, cat: prices } }));
  redirect("/admin/pricing?saved=catAddOns");
}

export async function updatePackagesAndMemberDiscount(formData: FormData) {
  await saveConfigPatch((c) => ({
    ...c,
    packages: {
      freshStart: num(formData, "package-freshStart"),
      pampered: num(formData, "package-pampered"),
      vip: num(formData, "package-vip"),
    },
    memberAddonDiscountPercent: num(formData, "memberAddonDiscountPercent"),
  }));
  redirect("/admin/pricing?saved=packages");
}

export async function updateCreativeTiers(formData: FormData) {
  await saveConfigPatch((c) => ({
    ...c,
    creative: {
      accentPop: num(formData, "creative-accentPop"),
      showstopper: num(formData, "creative-showstopper"),
      fantasy: {
        upTo15: num(formData, "creative-fantasy-upTo15"),
        upTo40: num(formData, "creative-fantasy-upTo40"),
        over40: num(formData, "creative-fantasy-over40"),
      },
    },
  }));
  redirect("/admin/pricing?saved=creative");
}

export async function updateGroomPackTiers(formData: FormData) {
  await saveConfigPatch((c) => ({
    ...c,
    groomPacks: {
      five: {
        paidCount: num(formData, "groomPack-five-paidCount"),
        freeCount: num(formData, "groomPack-five-freeCount"),
      },
      nine: {
        paidCount: num(formData, "groomPack-nine-paidCount"),
        freeCount: num(formData, "groomPack-nine-freeCount"),
      },
    },
  }));
  redirect("/admin/pricing?saved=groomPacks");
}
