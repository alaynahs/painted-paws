"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import {
  applyMemberAddonDiscount,
  calculateDogPrice,
  dogAddOns,
  DOG_SERVICE_LABELS,
  GROOM_PACK_TIER_LABELS,
  memberPackagePrices,
  MEMBERSHIP_TIER_LABELS,
  MEMBERSHIP_TIER_SERVICE,
  PACKAGE_LABELS,
  type GroomPackService,
  type GroomPackTier,
  type MembershipTier,
  type PackageTier,
  type PricingConfig,
} from "@/lib/pricing/pricing";
import { getPricingConfig } from "@/lib/pricing/config";

interface PetRow {
  species: "dog" | "cat";
  coat: "short" | "long";
  weight_lb: number;
  is_puppy?: boolean;
  name: string;
}

function readBundle(formData: FormData) {
  const bundle = (formData.get("addonBundle") as string) || "none";
  return bundle === "none" ? null : bundle;
}

function readAddonNames(formData: FormData): string[] {
  try {
    return JSON.parse((formData.get("addonNames") as string) || "[]");
  } catch {
    return [];
  }
}

async function isAdminUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

function addonNamesTotal(
  addonNames: string[],
  hasMemberDiscount: boolean,
  config: PricingConfig,
) {
  return dogAddOns(config)
    .filter((a) => addonNames.includes(a.name))
    .reduce(
      (sum, a) =>
        sum + (hasMemberDiscount ? applyMemberAddonDiscount(a.price, config) : a.price),
      0,
    );
}

function computeMembershipMonthlyPrice(
  pet: PetRow,
  tier: MembershipTier,
  bundle: string | null,
  addonNames: string[],
  config: PricingConfig,
) {
  const tierPrice = calculateDogPrice(
    {
      weightLb: pet.weight_lb,
      coat: pet.coat,
      service: MEMBERSHIP_TIER_SERVICE[tier],
      isPuppy: false,
      deshed: false,
    },
    config,
  ).total;
  const bundlePrice = bundle
    ? memberPackagePrices(config)[bundle as PackageTier]
    : 0;
  return tierPrice + bundlePrice + addonNamesTotal(addonNames, true, config);
}

export async function joinMembership(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!stripe) {
    redirect("/membership?error=Online+payment+isn%27t+set+up+yet.");
  }

  const petId = formData.get("petId") as string;
  const tier = formData.get("tier") as MembershipTier;
  const bundle = readBundle(formData);
  const addonNames = readAddonNames(formData);

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", petId)
    .eq("owner_id", user.id)
    .single();

  if (!pet) redirect("/membership?error=Pet%20not%20found");
  if (pet.species !== "dog") {
    redirect("/membership?error=Memberships%20are%20for%20dogs%20only%20right%20now.");
  }

  const config = await getPricingConfig();
  const monthlyPrice = computeMembershipMonthlyPrice(pet, tier, bundle, addonNames, config);

  const { data: membership, error } = await supabase
    .from("memberships")
    .insert({
      customer_id: user.id,
      pet_id: petId,
      tier,
      addon_bundle: bundle,
      addon_names: addonNames,
      payment_method: "online",
      status: "pending",
      monthly_price: monthlyPrice,
    })
    .select("id")
    .single();

  if (error || !membership) {
    redirect(
      `/membership?error=${encodeURIComponent(error?.message ?? "Could not start membership")}`,
    );
  }

  const origin = (await headers()).get("origin");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${pet.name} · ${MEMBERSHIP_TIER_LABELS[tier]} Membership`,
          },
          unit_amount: Math.round(monthlyPrice * 100),
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    metadata: { membershipId: membership.id, kind: "membership" },
    success_url: `${origin}/membership?joined=1`,
    cancel_url: `${origin}/membership?message=Membership+signup+cancelled.`,
  });

  if (!session.url) redirect("/membership?error=Could%20not%20start%20checkout");
  redirect(session.url);
}

export async function cancelMembership(membershipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = await isAdminUser(supabase, user.id);

  let query = supabase
    .from("memberships")
    .select("id, stripe_subscription_id")
    .eq("id", membershipId);
  if (!admin) query = query.eq("customer_id", user.id);
  const { data: membership } = await query.single();

  if (!membership) redirect("/membership?error=Membership%20not%20found");

  if (membership.stripe_subscription_id && stripe) {
    try {
      await stripe.subscriptions.cancel(membership.stripe_subscription_id);
    } catch (err) {
      console.error("[cancelMembership] stripe cancel failed", err);
      redirect(
        "/membership?error=Could+not+cancel+the+subscription.+Please+try+again+or+email+us.",
      );
    }
  }

  await supabase
    .from("memberships")
    .update({ status: "cancelled" })
    .eq("id", membershipId);

  redirect("/membership?message=Membership+cancelled.");
}

export async function adminCreateMembership(formData: FormData) {
  const { supabase } = await requireAdmin();

  const customerId = formData.get("customerId") as string;
  const petId = formData.get("petId") as string;
  const tier = formData.get("tier") as MembershipTier;
  const paymentMethod = (formData.get("paymentMethod") as string) || "in_person";
  const bundle = readBundle(formData);
  const addonNames = readAddonNames(formData);

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", petId)
    .single();

  if (!pet) redirect("/admin/memberships?error=Pet%20not%20found");

  const config = await getPricingConfig();
  const monthlyPrice = computeMembershipMonthlyPrice(pet, tier, bundle, addonNames, config);

  const { error } = await supabase.from("memberships").insert({
    customer_id: customerId,
    pet_id: petId,
    tier,
    addon_bundle: bundle,
    addon_names: addonNames,
    payment_method: paymentMethod,
    monthly_price: monthlyPrice,
  });

  if (error) {
    redirect(`/admin/memberships?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/admin/memberships?created=1");
}

export async function purchaseGroomPack(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!stripe) {
    redirect("/membership?error=Online+payment+isn%27t+set+up+yet.");
  }

  const petId = formData.get("petId") as string;
  const service = formData.get("service") as GroomPackService;
  const tier = formData.get("tier") as GroomPackTier;
  const bundle = readBundle(formData);
  const addonNames = readAddonNames(formData);

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", petId)
    .eq("owner_id", user.id)
    .single();

  if (!pet) redirect("/membership?error=Pet%20not%20found");
  if (pet.species !== "dog") {
    redirect("/membership?error=Groom%20packs%20are%20for%20dogs%20only%20right%20now.");
  }

  const { data: activeMembership } = await supabase
    .from("memberships")
    .select("id")
    .eq("pet_id", petId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const hasMembership = !!activeMembership;

  const config = await getPricingConfig();
  const { paidCount, freeCount } = config.groomPacks[tier];
  const unitPrice = calculateDogPrice(
    {
      weightLb: pet.weight_lb,
      coat: pet.coat,
      service,
      isPuppy: pet.is_puppy ?? false,
      deshed: false,
    },
    config,
  ).total;
  const packPrice = unitPrice * paidCount;
  const bundlePrice = bundle
    ? hasMembership
      ? memberPackagePrices(config)[bundle as PackageTier]
      : config.packages[bundle as PackageTier]
    : 0;
  const addonsPrice = addonNamesTotal(addonNames, hasMembership, config);
  const totalPrice = packPrice + bundlePrice + addonsPrice;

  const { data: pack, error } = await supabase
    .from("groom_credit_packs")
    .insert({
      customer_id: user.id,
      pet_id: petId,
      service,
      paid_count: paidCount,
      free_count: freeCount,
      unit_price: unitPrice,
      total_price: totalPrice,
      addon_bundle: bundle,
      addon_names: addonNames,
    })
    .select("id")
    .single();

  if (error || !pack) {
    redirect(
      `/membership?error=${encodeURIComponent(error?.message ?? "Could not start purchase")}`,
    );
  }

  const lineItems = [
    {
      price_data: {
        currency: "usd" as const,
        product_data: {
          name: `${pet.name} · ${GROOM_PACK_TIER_LABELS[tier]} (${DOG_SERVICE_LABELS[service]})`,
        },
        unit_amount: Math.round(packPrice * 100),
      },
      quantity: 1,
    },
    ...(bundle
      ? [
          {
            price_data: {
              currency: "usd" as const,
              product_data: {
                name: `${pet.name} · ${PACKAGE_LABELS[bundle as PackageTier]} (bundle)`,
              },
              unit_amount: Math.round(bundlePrice * 100),
            },
            quantity: 1,
          },
        ]
      : []),
    ...(addonNames.length > 0
      ? [
          {
            price_data: {
              currency: "usd" as const,
              product_data: {
                name: `${pet.name} · Add-ons (${addonNames.join(", ")})`,
              },
              unit_amount: Math.round(addonsPrice * 100),
            },
            quantity: 1,
          },
        ]
      : []),
  ];

  const origin = (await headers()).get("origin");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    metadata: { packId: pack.id, kind: "groomPack" },
    success_url: `${origin}/membership?message=Pack+purchased!+Credits+added+to+your+account.`,
    cancel_url: `${origin}/membership?message=Purchase+cancelled.`,
  });

  if (!session.url) redirect("/membership?error=Could%20not%20start%20checkout");
  redirect(session.url);
}
