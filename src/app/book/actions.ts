"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import {
  applyMemberAddonDiscount,
  applyDiscount,
  calculateCatPrice,
  calculateCreativePrice,
  calculateDogPrice,
  calculateSalesTax,
  SALES_TAX_PERCENT,
  catAddOns,
  catWeightClass,
  CREATIVE_TIER_LABELS,
  dogAddOns,
  dogWeightClass,
  formatServiceLabel,
  memberPackagePrices,
  PACKAGE_LABELS,
  type CatServiceLevel,
  type CreativeTier,
  type DogBookingService,
  type GroomPackService,
  type PackageTier,
  type PricingConfig,
} from "@/lib/pricing/pricing";
import { getPricingConfig } from "@/lib/pricing/config";
import { getCustomerCoupon } from "@/lib/coupons/actions";
import { getActivePromotion } from "@/lib/promotions/actions";
import { promotionAppliesToDate } from "@/lib/promotions/helpers";
import {
  BOOKING_HOURS,
  MAX_APPOINTMENTS_PER_DAY,
  MAX_NO_SHOWS,
  NO_SHOW_GRACE_MINUTES,
  PICKUP_MIN_LEAD_HOURS,
} from "@/lib/booking-hours";
import { centralWallClockToInstant, formatDate, formatHour } from "@/lib/format";
import { checkPickupEligibility } from "@/lib/geocoding";
import { notifyEmail, notifyText } from "@/lib/notifications/service";
import {
  BUSINESS_EMAIL,
  adminNewBookingEmail,
  appointmentConfirmedEmail,
  bookingConfirmationEmail,
  bookingConfirmationSms,
  checkoutAbandonedEmail,
  firstTimeWelcomeEmail,
  firstTimeWelcomeSms,
  newClientVaccineReminderSms,
  paymentLinkEmail,
} from "@/lib/notifications/templates";

interface PetRow {
  species: "dog" | "cat";
  coat: "short" | "long";
  weight_lb: number;
  is_puppy?: boolean;
}

function computeAppointmentPrice(
  pet: PetRow,
  service: string,
  deshed: boolean,
  creativeTier: string,
  addOnNames: string[],
  packageTier: string,
  standalone: boolean,
  pickupDropoff: boolean,
  hasMembership: boolean,
  redeemedCredit: boolean,
  promoDiscountPercent: number | null,
  config: PricingConfig,
) {
  const pickupFee = pickupDropoff ? config.flatFees.pickupDropoff : 0;
  const pickupLabel = pickupDropoff ? ["Pickup & Drop-Off"] : [];
  const addOnPrice = (price: number) =>
    hasMembership ? applyMemberAddonDiscount(price, config) : price;
  const maybeApplyPromo = (price: number) =>
    promoDiscountPercent != null ? applyDiscount(price, promoDiscountPercent) : price;

  if (standalone) {
    const catalog = pet.species === "dog" ? dogAddOns(config) : catAddOns(config);
    const selectedAddOns = catalog.filter((a) => addOnNames.includes(a.name));
    return {
      price:
        maybeApplyPromo(
          selectedAddOns.reduce((sum, a) => sum + addOnPrice(a.price), 0),
        ) + pickupFee,
      addOns: [...selectedAddOns.map((a) => a.name), ...pickupLabel],
    };
  }

  // A redeemed groom pack credit covers the base weight/coat groom price
  // only — de-shed, creative color, add-ons, bundles, and pickup still cost
  // extra on top, same as the à la carte price for those items.
  const baseTotal = redeemedCredit
    ? deshed
      ? config.flatFees.deshed
      : 0
    : pet.species === "dog"
      ? calculateDogPrice(
          {
            weightLb: pet.weight_lb,
            coat: pet.coat,
            service: service as DogBookingService,
            isPuppy: pet.is_puppy ?? false,
            deshed,
          },
          config,
        ).total
      : calculateCatPrice(
          {
            weightLb: pet.weight_lb,
            coat: pet.coat,
            service: service as CatServiceLevel,
            waterless: false,
            deshed,
          },
          config,
        ).total;

  const creativeAddOnPrice =
    creativeTier !== "none" && pet.species === "dog"
      ? calculateCreativePrice(creativeTier as CreativeTier, pet.weight_lb, config)
      : 0;

  const catalog = pet.species === "dog" ? dogAddOns(config) : catAddOns(config);
  const selectedAddOns = catalog.filter((a) => addOnNames.includes(a.name));
  const addOnsTotal = selectedAddOns.reduce(
    (sum, a) => sum + addOnPrice(a.price),
    0,
  );

  const packagePrice =
    packageTier !== "none"
      ? hasMembership
        ? memberPackagePrices(config)[packageTier as PackageTier]
        : config.packages[packageTier as PackageTier]
      : 0;

  const labels = [
    ...(redeemedCredit ? ["Groom pack credit redeemed"] : []),
    ...(deshed ? ["De-shed treatment"] : []),
    ...(creativeTier !== "none"
      ? [CREATIVE_TIER_LABELS[creativeTier as CreativeTier]]
      : []),
    ...selectedAddOns.map((a) => a.name),
    ...(packageTier !== "none"
      ? [PACKAGE_LABELS[packageTier as PackageTier]]
      : []),
    ...pickupLabel,
  ];

  return {
    price:
      maybeApplyPromo(
        baseTotal + creativeAddOnPrice + addOnsTotal + packagePrice,
      ) + pickupFee,
    addOns: labels,
  };
}

async function petHasActiveMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  petId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("pet_id", petId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return !!data;
}

interface RedeemablePack {
  id: string;
  paid_count: number;
  free_count: number;
  credits_used: number;
}

async function findRedeemablePack(
  supabase: Awaited<ReturnType<typeof createClient>>,
  petId: string,
  service: string,
): Promise<RedeemablePack | null> {
  if (service !== "bath" && service !== "haircut") return null;

  const { data } = await supabase
    .from("groom_credit_packs")
    .select("id, paid_count, free_count, credits_used")
    .eq("pet_id", petId)
    .eq("service", service as GroomPackService)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: true });

  return (
    (data ?? []).find((p) => p.credits_used < p.paid_count + p.free_count) ??
    null
  );
}

async function redeemPackCredit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pack: RedeemablePack,
) {
  await supabase
    .from("groom_credit_packs")
    .update({ credits_used: pack.credits_used + 1 })
    .eq("id", pack.id);
}

function readBookingFields(formData: FormData) {
  return {
    petId: formData.get("petId") as string,
    service: formData.get("service") as string,
    deshed: formData.get("deshed") === "true",
    creativeTier: (formData.get("creativeTier") as string) || "none",
    addOnNames: JSON.parse(
      (formData.get("addOnNames") as string) || "[]",
    ) as string[],
    packageTier: (formData.get("packageTier") as string) || "none",
    standalone: formData.get("standalone") === "true",
    date: formData.get("date") as string,
    hour: Number(formData.get("hour")),
    paymentMethod: formData.get("paymentMethod") as string,
    customerNote: (formData.get("customerNote") as string) || null,
    haircutDescription: (formData.get("haircutDescription") as string) || null,
    pickupDropoff: formData.get("pickupDropoff") === "true",
    pickupAddress: (formData.get("pickupAddress") as string) || null,
    redeemCredit: formData.get("redeemCredit") === "true",
    applyCoupon: formData.get("applyCoupon") === "true",
    adminDiscountType: (formData.get("adminDiscountType") as string) || "none",
    adminDiscountValue: Number(formData.get("adminDiscountValue")) || 0,
  };
}

async function uploadInspoPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  formData: FormData,
): Promise<string | null> {
  const file = formData.get("inspoPhoto") as File | null;
  if (!file || file.size === 0) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${customerId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("inspo-photos")
    .upload(path, file, { contentType: file.type });

  return error ? null : path;
}

function readWaiverFields(formData: FormData) {
  return {
    signedName: (formData.get("waiverSignedName") as string) || "",
    signedDate: (formData.get("waiverSignedDate") as string) || "",
    vaccinatedLast24h: formData.get("waiverVaccinatedLast24h") === "true",
    behavioralConcerns: formData.get("waiverBehavioralConcerns") === "true",
    behavioralNote: (formData.get("waiverBehavioralNote") as string) || null,
    seniorOrSpecialNeeds:
      formData.get("waiverSeniorOrSpecialNeeds") === "true",
    seniorNote: (formData.get("waiverSeniorNote") as string) || null,
    severelyMatted: formData.get("waiverSeverelyMatted") === "true",
    mattedNote: (formData.get("waiverMattedNote") as string) || null,
    emergencyConsent: formData.get("waiverEmergencyConsent") === "true",
    photoConsent: formData.get("waiverPhotoConsent") === "true",
    liabilityAccepted: formData.get("waiverLiabilityAccepted") === "true",
  };
}

function waiverError(w: ReturnType<typeof readWaiverFields>): string | null {
  if (w.vaccinatedLast24h) {
    return "Pets vaccinated in the last 24 hours can't be groomed yet. Please pick a later date.";
  }
  if (!w.liabilityAccepted) {
    return "Please accept the waiver terms to book.";
  }
  if (!w.signedName.trim()) {
    return "Please sign the waiver with your full name.";
  }
  return null;
}

async function insertWaiverSigning(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    appointmentId,
    customerId,
    petId,
    waiver,
  }: {
    appointmentId: string;
    customerId: string;
    petId: string;
    waiver: ReturnType<typeof readWaiverFields>;
  },
) {
  await supabase.from("waiver_signings").insert({
    appointment_id: appointmentId,
    customer_id: customerId,
    pet_id: petId,
    signed_name: waiver.signedName,
    vaccinated_last_24h: waiver.vaccinatedLast24h,
    behavioral_concerns: waiver.behavioralConcerns,
    behavioral_note: waiver.behavioralNote,
    senior_or_special_needs: waiver.seniorOrSpecialNeeds,
    senior_note: waiver.seniorNote,
    severely_matted: waiver.severelyMatted,
    matted_note: waiver.mattedNote,
    emergency_care_consent: waiver.emergencyConsent,
    photo_release_consent: waiver.photoConsent,
    liability_accepted: waiver.liabilityAccepted,
  });
}

export async function sendBookingNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    customerId,
    petId,
    petName,
    appointmentId,
    date,
    hour,
    rabiesVaccinePath,
    service,
    price,
  }: {
    customerId: string;
    petId: string;
    petName: string;
    appointmentId: string;
    date: string;
    hour: number;
    rabiesVaccinePath: string | null;
    service: string;
    price: number;
  },
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", customerId)
    .single();

  const target = {
    customerId,
    petId,
    appointmentId,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
  };
  const origin = (await headers()).get("origin");
  const vars = {
    firstName: (profile?.full_name || "there").split(" ")[0],
    petName,
    date: formatDate(date),
    time: formatHour(hour),
  };

  await notifyText(
    supabase,
    target,
    "booking_confirmation",
    bookingConfirmationSms(vars),
  );
  await notifyEmail(
    supabase,
    target,
    "booking_confirmation",
    bookingConfirmationEmail(vars),
  );

  await notifyEmail(
    supabase,
    { ...target, email: BUSINESS_EMAIL },
    "admin_new_booking",
    adminNewBookingEmail({
      customerName: profile?.full_name || "Unknown",
      customerPhone: profile?.phone ?? "",
      petName,
      service,
      date: vars.date,
      time: vars.time,
      price,
      manageUrl: `${origin}/admin/appointments/${appointmentId}`,
    }),
  );

  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);

  if ((count ?? 0) <= 1) {
    await notifyText(
      supabase,
      target,
      "first_time_welcome",
      firstTimeWelcomeSms(vars),
    );
    await notifyEmail(
      supabase,
      target,
      "first_time_welcome",
      firstTimeWelcomeEmail(vars),
    );
  }

  if (!rabiesVaccinePath) {
    await notifyText(
      supabase,
      target,
      "new_client_vaccine_reminder",
      newClientVaccineReminderSms(vars),
    );
  }
}

// Called wherever an appointment gets auto-cancelled for being abandoned at
// checkout — both the cancel_url route (explicit back-click) and the
// webhook's checkout.session.expired handler (silent abandonment). Lets the
// admin know a slot opened back up and who to maybe follow up with.
export async function notifyAdminCheckoutAbandoned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appointmentId: string,
) {
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "customer_id, service, appointment_date, appointment_hour, price, pets(name)",
    )
    .eq("id", appointmentId)
    .single();
  if (!appt) return;

  const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", appt.customer_id)
    .single();

  await notifyEmail(
    supabase,
    { customerId: appt.customer_id, appointmentId, email: BUSINESS_EMAIL },
    "admin_checkout_abandoned",
    checkoutAbandonedEmail({
      customerName: profile?.full_name || "Unknown",
      customerPhone: profile?.phone ?? "",
      petName: pet?.name ?? "Pet",
      service: appt.service,
      date: formatDate(appt.appointment_date),
      time: formatHour(appt.appointment_hour),
      price: appt.price,
    }),
  );
}

export interface HourAvailability {
  bookedHours: number[];
  dayBlocked: boolean;
  dayFull: boolean;
}

// A groomed dog/cat needs the groomer's undivided time after their slot
// starts, scaled to how long that size of pet typically takes. Standalone
// (add-on only) visits are quick and don't need extra buffer room.
function bufferHoursFor(
  service: string,
  species: "dog" | "cat",
  weightLb: number,
): number {
  if (service === "standalone") return 0;
  if (species === "dog") {
    const weightClass = dogWeightClass(weightLb);
    return weightClass === "large" || weightClass === "xlarge" ? 2 : 1;
  }
  return catWeightClass(weightLb) === "over20" ? 2 : 1;
}

export async function getBookedHours(
  date: string,
  excludeAppointmentId?: string,
): Promise<HourAvailability> {
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("id, appointment_hour, service, pets(species, weight_lb)")
    .eq("appointment_date", date)
    .neq("status", "cancelled");

  if (excludeAppointmentId) {
    query = query.neq("id", excludeAppointmentId);
  }

  const [{ data: appts }, { data: blocks }] = await Promise.all([
    query,
    supabase
      .from("blocked_slots")
      .select("blocked_hour")
      .eq("blocked_date", date),
  ]);

  const rows = appts ?? [];
  const dayFull = rows.length >= MAX_APPOINTMENTS_PER_DAY;

  const bookedHours = new Set<number>();
  for (const row of rows) {
    bookedHours.add(row.appointment_hour as number);
    const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
    if (!pet) continue;
    const buffer = bufferHoursFor(row.service, pet.species, pet.weight_lb);
    for (let i = 1; i <= buffer; i++) {
      bookedHours.add((row.appointment_hour as number) + i);
    }
  }

  if (dayFull) {
    for (const h of BOOKING_HOURS) bookedHours.add(h);
  }

  const dayBlocked = (blocks ?? []).some((b) => b.blocked_hour === null);
  for (const b of blocks ?? []) {
    if (b.blocked_hour !== null) bookedHours.add(b.blocked_hour);
  }

  return {
    bookedHours: Array.from(bookedHours),
    dayBlocked,
    dayFull,
  };
}

// Dates fully closed (admin-blocked whole day, or already at the daily
// appointment cap) within a range — used to grey them out on the calendar
// itself, so customers don't have to pick a date just to find out it's full.
export async function getUnavailableDates(
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const supabase = await createClient();

  const [{ data: blocks }, { data: appts }] = await Promise.all([
    supabase
      .from("blocked_slots")
      .select("blocked_date")
      .is("blocked_hour", null)
      .gte("blocked_date", startDate)
      .lte("blocked_date", endDate),
    supabase
      .from("appointments")
      .select("appointment_date")
      .neq("status", "cancelled")
      .gte("appointment_date", startDate)
      .lte("appointment_date", endDate),
  ]);

  const unavailable = new Set((blocks ?? []).map((b) => b.blocked_date as string));

  const countByDate = new Map<string, number>();
  for (const a of appts ?? []) {
    const date = a.appointment_date as string;
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }
  for (const [date, count] of countByDate) {
    if (count >= MAX_APPOINTMENTS_PER_DAY) unavailable.add(date);
  }

  return Array.from(unavailable);
}

export async function getNoShowCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
): Promise<number> {
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("no_show", true);
  return count ?? 0;
}

export async function isBlockedFromOnlineBooking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
): Promise<boolean> {
  const [{ data: profile }, noShowCount] = await Promise.all([
    supabase.from("profiles").select("do_not_book").eq("id", customerId).single(),
    getNoShowCount(supabase, customerId),
  ]);
  return !!profile?.do_not_book || noShowCount >= MAX_NO_SHOWS;
}

const NO_SHOW_BLOCK_MESSAGE =
  "Online booking isn't available for this account right now. Please email booking@paintedpawsaustin.com to book your appointment.";

const PICKUP_OUT_OF_RANGE_MESSAGE =
  "That address is outside our 15-minute pickup & drop-off radius. Please email booking@paintedpawsaustin.com if you have any questions.";

const PICKUP_UNVERIFIED_MESSAGE =
  "We couldn't verify that address is within our 15-minute pickup & drop-off radius. Please email booking@paintedpawsaustin.com to confirm before booking pickup & drop-off.";

const PAST_TIME_MESSAGE =
  "That time has already passed. Please choose a different time.";

const PICKUP_LEAD_TIME_MESSAGE = `Pickup & drop-off appointments must be booked at least ${PICKUP_MIN_LEAD_HOURS} hour${PICKUP_MIN_LEAD_HOURS === 1 ? "" : "s"} in advance. Please choose a later time or a different day.`;

function bookingTimeError(
  date: string,
  hour: number,
  pickupDropoff: boolean,
): string | null {
  const apptTime = appointmentDateTime(date, hour);
  const now = new Date();
  if (apptTime.getTime() <= now.getTime()) return PAST_TIME_MESSAGE;
  if (pickupDropoff) {
    const minLeadMs = PICKUP_MIN_LEAD_HOURS * 60 * 60 * 1000;
    if (apptTime.getTime() - now.getTime() < minLeadMs) {
      return PICKUP_LEAD_TIME_MESSAGE;
    }
  }
  return null;
}

async function pickupAddressError(
  pickupDropoff: boolean,
  pickupAddress: string | null,
): Promise<string | null> {
  if (!pickupDropoff || !pickupAddress) return null;
  const eligibility = await checkPickupEligibility(pickupAddress);
  if (eligibility.status === "ineligible") return PICKUP_OUT_OF_RANGE_MESSAGE;
  if (eligibility.status === "unknown") return PICKUP_UNVERIFIED_MESSAGE;
  return null;
}

export async function checkPickupAddress(address: string) {
  return checkPickupEligibility(address);
}

export async function getPetMembershipStatus(petId: string) {
  const supabase = await createClient();
  return petHasActiveMembership(supabase, petId);
}

export async function getAvailableGroomCredits(petId: string, service: string) {
  if (service !== "bath" && service !== "haircut") return 0;

  const supabase = await createClient();
  const { data } = await supabase
    .from("groom_credit_packs")
    .select("paid_count, free_count, credits_used")
    .eq("pet_id", petId)
    .eq("service", service as GroomPackService)
    .eq("payment_status", "paid");

  return (data ?? []).reduce(
    (sum, p) => sum + Math.max(0, p.paid_count + p.free_count - p.credits_used),
    0,
  );
}

export async function createAppointment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (await isBlockedFromOnlineBooking(supabase, user.id)) {
    redirect(`/book?error=${encodeURIComponent(NO_SHOW_BLOCK_MESSAGE)}`);
  }

  const fields = readBookingFields(formData);
  const waiver = readWaiverFields(formData);
  const waiverIssue = waiverError(waiver);
  if (waiverIssue) {
    redirect(`/book?error=${encodeURIComponent(waiverIssue)}`);
  }

  const timeIssue = bookingTimeError(fields.date, fields.hour, fields.pickupDropoff);
  if (timeIssue) {
    redirect(`/book?error=${encodeURIComponent(timeIssue)}`);
  }

  const pickupIssue = await pickupAddressError(
    fields.pickupDropoff,
    fields.pickupAddress,
  );
  if (pickupIssue) {
    redirect(`/book?error=${encodeURIComponent(pickupIssue)}`);
  }

  // Paying online at booking is the only option now — fail fast, before
  // creating the appointment, if Stripe isn't configured to take the charge.
  if (!stripe) {
    redirect(
      `/book?error=${encodeURIComponent("Online payment isn't set up yet — please email booking@paintedpawsaustin.com to book.")}`,
    );
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", fields.petId)
    .single();

  if (!pet) redirect("/book?error=Pet%20not%20found");
  if (!pet.is_active) {
    redirect(
      `/book?error=${encodeURIComponent("This pet's profile is inactive and can't be booked online.")}`,
    );
  }
  if (pet.do_not_book) {
    redirect(
      `/book?error=${encodeURIComponent("This pet can't be booked online. Please email booking@paintedpawsaustin.com.")}`,
    );
  }

  const hasMembership = await petHasActiveMembership(supabase, fields.petId);
  const redeemablePack = fields.redeemCredit
    ? await findRedeemablePack(supabase, fields.petId, fields.service)
    : null;
  const activePromotion = await getActivePromotion();
  const promoApplies =
    !!activePromotion &&
    promotionAppliesToDate(activePromotion.maxAppointmentLeadDays, fields.date);
  const promoDiscountPercent = promoApplies ? activePromotion!.discountPercent : null;
  const promoId = promoApplies ? activePromotion!.id : null;
  // A personal coupon (admin-assigned, e.g. an apology discount) is opt-in,
  // never automatic — the customer explicitly chooses to redeem it (see
  // the "applyCoupon" checkbox in booking-flow.tsx), same as redeeming a
  // groom pack credit above. It stacks on top of whatever sitewide promo
  // is running, then gets marked used once this booking actually goes
  // through — see the redemption in the Stripe webhook.
  const coupon = await getCustomerCoupon(user.id);
  const couponApplied = fields.applyCoupon && !!coupon;
  const couponPercent = couponApplied ? (coupon!.discountPercent ?? 0) : 0;
  const couponAmount = couponApplied ? (coupon!.discountAmount ?? 0) : 0;
  const totalDiscountPercent = (promoDiscountPercent ?? 0) + couponPercent || null;
  const config = await getPricingConfig();
  const { price: priceBeforeCouponAmount, addOns } = computeAppointmentPrice(
    pet,
    fields.service,
    fields.deshed,
    fields.creativeTier,
    fields.addOnNames,
    fields.packageTier,
    fields.standalone,
    fields.pickupDropoff,
    hasMembership,
    !!redeemablePack,
    totalDiscountPercent,
    config,
  );
  const subtotal = Math.max(
    0,
    Math.round((priceBeforeCouponAmount - couponAmount) * 100) / 100,
  );
  const salesTax = calculateSalesTax(subtotal);
  const price = subtotal + salesTax;

  const inspoPhotoPath = await uploadInspoPhoto(supabase, user.id, formData);

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      customer_id: user.id,
      pet_id: fields.petId,
      service: fields.service,
      add_ons: addOns,
      appointment_date: fields.date,
      appointment_hour: fields.hour,
      payment_method: "online",
      price,
      sales_tax: salesTax,
      customer_note: fields.customerNote,
      haircut_description: fields.haircutDescription,
      inspo_photo_path: inspoPhotoPath,
      pickup_dropoff: fields.pickupDropoff,
      pickup_address: fields.pickupAddress,
      promo_id: promoId,
      coupon_id: couponApplied ? coupon!.id : null,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    redirect(`/book?error=${encodeURIComponent(error?.message ?? "Could not book")}`);
  }

  if (redeemablePack) {
    await redeemPackCredit(supabase, redeemablePack);
  }

  await insertWaiverSigning(supabase, {
    appointmentId: appointment.id,
    customerId: user.id,
    petId: fields.petId,
    waiver,
  });

  // Booking confirmations (and the admin new-booking alert) fire only once
  // Stripe confirms payment actually went through — see the webhook's
  // checkout.session.completed handler. Sending them here would tell a
  // customer they're booked before they've paid a cent.
  const origin = (await headers()).get("origin");
  const checkoutUrl = await createAppointmentCheckoutSession(
    origin,
    appointment.id,
    pet.name,
    fields.service,
    subtotal,
    salesTax,
    "/account?booked=1&message=Payment+received.+Thank+you!",
    `/api/book/checkout-cancelled?appointmentId=${appointment.id}`,
  );

  if (!checkoutUrl) {
    redirect(
      `/account?booked=1&error=${encodeURIComponent("Your appointment is booked, but checkout couldn't start. Please pay from your account to confirm your spot.")}`,
    );
  }
  redirect(checkoutUrl);
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

export async function updateAppointment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = await isAdminUser(supabase, user.id);
  const appointmentId = formData.get("appointmentId") as string;
  const fields = readBookingFields(formData);
  const editPath = admin
    ? `/admin/appointments/${appointmentId}`
    : `/account/appointments/${appointmentId}`;

  if (!admin) {
    const timeIssue = bookingTimeError(fields.date, fields.hour, fields.pickupDropoff);
    if (timeIssue) {
      redirect(`${editPath}?error=${encodeURIComponent(timeIssue)}`);
    }

    const pickupIssue = await pickupAddressError(
      fields.pickupDropoff,
      fields.pickupAddress,
    );
    if (pickupIssue) {
      redirect(`${editPath}?error=${encodeURIComponent(pickupIssue)}`);
    }
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", fields.petId)
    .single();

  if (!pet) {
    redirect(`${editPath}?error=Pet%20not%20found`);
  }

  // Edits neither grant nor revoke a promo — whatever this appointment
  // already had (or didn't) at booking time carries over as-is, at that
  // promotion's original discount rate.
  const { data: existingAppt } = await supabase
    .from("appointments")
    .select("promo_id")
    .eq("id", appointmentId)
    .single();
  let promoDiscountPercent: number | null = null;
  if (existingAppt?.promo_id) {
    const { data: promo } = await supabase
      .from("promotions")
      .select("discount_percent")
      .eq("id", existingAppt.promo_id)
      .single();
    promoDiscountPercent = promo?.discount_percent ?? null;
  }

  const hasMembership = await petHasActiveMembership(supabase, fields.petId);
  const redeemablePack = fields.redeemCredit
    ? await findRedeemablePack(supabase, fields.petId, fields.service)
    : null;
  const config = await getPricingConfig();
  const { price: subtotal, addOns } = computeAppointmentPrice(
    pet,
    fields.service,
    fields.deshed,
    fields.creativeTier,
    fields.addOnNames,
    fields.packageTier,
    fields.standalone,
    fields.pickupDropoff,
    hasMembership,
    !!redeemablePack,
    promoDiscountPercent,
    config,
  );
  const salesTax = calculateSalesTax(subtotal);
  const price = subtotal + salesTax;

  if (redeemablePack) {
    await redeemPackCredit(supabase, redeemablePack);
  }

  let query = supabase
    .from("appointments")
    .update({
      service: fields.service,
      add_ons: addOns,
      appointment_date: fields.date,
      appointment_hour: fields.hour,
      payment_method: fields.paymentMethod,
      price,
      sales_tax: salesTax,
      customer_note: fields.customerNote,
      pickup_dropoff: fields.pickupDropoff,
      pickup_address: fields.pickupAddress,
    })
    .eq("id", appointmentId);

  if (!admin) {
    query = query.eq("customer_id", user.id);
  }

  const { error } = await query;

  if (error) {
    redirect(`${editPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(admin ? "/admin?saved=1" : "/account?saved=1");
}

function appointmentDateTime(date: string, hour: number): Date {
  return centralWallClockToInstant(date, hour);
}

export async function cancelAppointment(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = await isAdminUser(supabase, user.id);

  const { data: appt } = await supabase
    .from("appointments")
    .select("appointment_date, appointment_hour")
    .eq("id", appointmentId)
    .single();

  let noShow = false;
  if (appt) {
    const scheduled = appointmentDateTime(
      appt.appointment_date,
      appt.appointment_hour,
    );
    const deadline = admin
      ? new Date(scheduled.getTime() + NO_SHOW_GRACE_MINUTES * 60 * 1000)
      : scheduled;
    noShow = new Date().getTime() > deadline.getTime();
  }

  let query = supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      no_show: noShow,
    })
    .eq("id", appointmentId);

  if (!admin) {
    query = query.eq("customer_id", user.id);
  }

  await query;

  redirect(
    admin
      ? "/admin?message=Appointment+cancelled."
      : "/account?message=Appointment+cancelled.",
  );
}

export async function confirmAppointment(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = await isAdminUser(supabase, user.id);

  let query = supabase
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", appointmentId);

  if (!admin) {
    query = query.eq("customer_id", user.id);
  }

  const { data: appt } = await query
    .select("customer_id, appointment_date, appointment_hour, pets(name)")
    .single();

  if (appt) {
    const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", appt.customer_id)
      .single();

    await notifyEmail(
      supabase,
      {
        customerId: appt.customer_id,
        appointmentId,
        email: profile?.email ?? null,
        phone: profile?.phone ?? null,
      },
      "appointment_confirmed",
      appointmentConfirmedEmail({
        firstName: (profile?.full_name || "there").split(" ")[0],
        petName: pet?.name ?? "Pet",
        date: formatDate(appt.appointment_date),
        time: formatHour(appt.appointment_hour),
      }),
    );
  }

  redirect(
    admin
      ? "/admin?message=Appointment+confirmed."
      : "/account?message=Appointment+confirmed.",
  );
}

// Shared by payAppointmentNow (pay later from the account page) and
// createAppointment (pay-at-booking, now the only option for online
// bookings) so both go through the exact same Stripe Checkout setup.
async function createAppointmentCheckoutSession(
  origin: string | null,
  appointmentId: string,
  petName: string,
  service: string,
  subtotal: number,
  salesTax: number,
  successPath: string,
  cancelPath: string,
  // Live in-checkout flows (booking, or "Pay Now" from the account page) get
  // Stripe's 30-minute floor, since that customer is right there and any
  // longer just holds the slot from everyone else. A mailed payment link is
  // opened whenever the customer gets to it, so it gets Stripe's 24-hour
  // ceiling instead — see sendPaymentLinkEmail below.
  expiresInSeconds: number = 30 * 60,
): Promise<string | null> {
  if (!stripe) return null;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${petName} · ${formatServiceLabel(service)}`,
            // Stripe fetches this from its own servers, so it only renders
            // once this image is reachable at a real public URL (i.e. once
            // the site is deployed, not while testing on localhost).
            images: [`${origin}/logo.png`],
          },
          unit_amount: Math.round(subtotal * 100),
        },
        quantity: 1,
      },
      ...(salesTax > 0
        ? [
            {
              price_data: {
                currency: "usd" as const,
                product_data: {
                  name: `Sales Tax (${SALES_TAX_PERCENT}%)`,
                },
                unit_amount: Math.round(salesTax * 100),
              },
              quantity: 1,
            },
          ]
        : []),
    ],
    metadata: { appointmentId },
    success_url: `${origin}${successPath}`,
    cancel_url: `${origin}${cancelPath}`,
    // This is what actually protects the slot from a customer who abandons
    // checkout by closing the tab or hitting the browser's own back button —
    // neither of those ever visits cancel_url, so without this the
    // appointment would stay "booked" and unpaid forever. See the webhook's
    // checkout.session.expired handler.
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
  return session.url;
}

export async function payAppointmentNow(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, price, sales_tax, service, payment_status, pets(name)")
    .eq("id", appointmentId)
    .eq("customer_id", user.id)
    .single();

  if (!appt) redirect("/account?error=Appointment%20not%20found");
  if (appt.payment_status === "paid") redirect("/account");

  if (!stripe) {
    redirect(
      "/account?error=Online+payment+isn%27t+set+up+yet+%E2%80%94+please+pay+in+person.",
    );
  }

  const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
  const origin = (await headers()).get("origin");

  const checkoutUrl = await createAppointmentCheckoutSession(
    origin,
    appt.id,
    pet?.name ?? "Pet",
    appt.service,
    appt.price - appt.sales_tax,
    appt.sales_tax,
    "/account?message=Payment+received.+Thank+you!",
    `/api/book/checkout-cancelled?appointmentId=${appt.id}`,
  );

  if (!checkoutUrl) redirect("/account?error=Could%20not%20start%20checkout");
  redirect(checkoutUrl);
}

// Lets an admin email a Stripe payment link straight to a customer for an
// appointment booked on their behalf (e.g. a phone booking) instead of
// requiring them to log in and click "Pay Now" themselves.
export async function sendPaymentLinkEmail(appointmentId: string) {
  const { supabase } = await requireAdmin();
  const editPath = `/admin/appointments/${appointmentId}`;

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, customer_id, price, sales_tax, service, appointment_date, appointment_hour, payment_status, pets(name)",
    )
    .eq("id", appointmentId)
    .single();

  if (!appt) redirect(`${editPath}?error=Appointment%20not%20found`);
  if (appt.payment_status === "paid") {
    redirect(`${editPath}?message=${encodeURIComponent("This appointment is already paid.")}`);
  }
  if (!stripe) {
    redirect(
      `${editPath}?error=${encodeURIComponent("Online payment isn't set up yet.")}`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", appt.customer_id)
    .single();

  if (!profile?.email) {
    redirect(
      `${editPath}?error=${encodeURIComponent("This customer doesn't have an email on file.")}`,
    );
  }

  const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
  const origin = (await headers()).get("origin");

  const checkoutUrl = await createAppointmentCheckoutSession(
    origin,
    appt.id,
    pet?.name ?? "Pet",
    appt.service,
    appt.price - appt.sales_tax,
    appt.sales_tax,
    "/account?message=Payment+received.+Thank+you!",
    `/api/book/checkout-cancelled?appointmentId=${appt.id}`,
    24 * 60 * 60,
  );

  if (!checkoutUrl) {
    redirect(`${editPath}?error=${encodeURIComponent("Could not create a payment link.")}`);
  }

  const status = await notifyEmail(
    supabase,
    { customerId: appt.customer_id, appointmentId: appt.id, email: profile.email },
    "payment_link",
    paymentLinkEmail({
      firstName: (profile.full_name || "there").split(" ")[0],
      petName: pet?.name ?? "your pet",
      date: formatDate(appt.appointment_date),
      time: formatHour(appt.appointment_hour),
      price: appt.price,
      payUrl: checkoutUrl,
    }),
  );

  if (status !== "sent") {
    redirect(
      `${editPath}?error=${encodeURIComponent("Couldn't send the payment link email. Please try again.")}`,
    );
  }

  redirect(`${editPath}?message=${encodeURIComponent(`Payment link emailed to ${profile.email}.`)}`);
}

const MAX_TIP_CENTS = 50000; // $500 sanity cap

// Reached from the "ready for pickup" text link — no login, since it's a
// one-tap link sent straight to the customer's phone.
export async function payTip(formData: FormData) {
  const appointmentId = formData.get("appointmentId") as string;
  const tipCents = Math.min(
    Math.max(0, Math.round(Number(formData.get("tipCents")) || 0)),
    MAX_TIP_CENTS,
  );

  if (tipCents <= 0) {
    redirect(`/leave-a-review/${appointmentId}?error=Pick+a+tip+amount+first.`);
  }

  const supabase = createServiceClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, pets(name)")
    .eq("id", appointmentId)
    .single();

  if (!appt) redirect(`/leave-a-review/${appointmentId}?error=Appointment%20not%20found`);

  if (!stripe) {
    redirect(
      `/leave-a-review/${appointmentId}?error=Online+tipping+isn%27t+set+up+yet.`,
    );
  }

  const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
  const origin = (await headers()).get("origin");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Tip for ${pet?.name ?? "your pet"}'s groomer`,
          },
          unit_amount: tipCents,
        },
        quantity: 1,
      },
    ],
    metadata: { appointmentId: appt.id, kind: "tip" },
    success_url: `${origin}/leave-a-review/${appointmentId}?tipped=1`,
    cancel_url: `${origin}/leave-a-review/${appointmentId}`,
  });

  if (!session.url) {
    redirect(`/leave-a-review/${appointmentId}?error=Could%20not%20start%20checkout`);
  }
  redirect(session.url);
}

// Matches on phone, email, or a pet's name — whichever the admin has on
// hand when a customer calls in.
export async function searchCustomers(query: string) {
  const { supabase } = await requireAdmin();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const digits = trimmed.replace(/\D/g, "");

  const [{ data: byPhone }, { data: byEmail }, { data: byOwnerName }, { data: petsByName }] =
    await Promise.all([
      digits
        ? supabase.from("profiles").select("id").ilike("phone", `%${digits}%`)
        : Promise.resolve({ data: [] as { id: string }[] }),
      supabase.from("profiles").select("id").ilike("email", `%${trimmed}%`),
      supabase.from("profiles").select("id").ilike("full_name", `%${trimmed}%`),
      supabase.from("pets").select("owner_id").ilike("name", `%${trimmed}%`),
    ]);

  const profileIds = Array.from(
    new Set<string>([
      ...(byPhone ?? []).map((p) => p.id),
      ...(byEmail ?? []).map((p) => p.id),
      ...(byOwnerName ?? []).map((p) => p.id),
      ...(petsByName ?? []).map((p) => p.owner_id),
    ]),
  );
  if (profileIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email")
    .in("id", profileIds);

  if (!profiles || profiles.length === 0) return [];

  const { data: pets } = await supabase
    .from("pets")
    .select("*")
    .in(
      "owner_id",
      profiles.map((p) => p.id),
    );

  const { data: memberships } = await supabase
    .from("memberships")
    .select("pet_id")
    .eq("status", "active")
    .in(
      "pet_id",
      (pets ?? []).map((p) => p.id),
    );
  const petIdsWithMembership = new Set((memberships ?? []).map((m) => m.pet_id));

  return profiles.map((profile) => ({
    ...profile,
    pets: (pets ?? [])
      .filter((pet) => pet.owner_id === profile.id)
      .map((pet) => ({
        ...pet,
        hasMembership: petIdsWithMembership.has(pet.id),
      })),
  }));
}

export async function adminCreateAppointment(formData: FormData) {
  const { supabase } = await requireAdmin();

  const customerId = formData.get("customerId") as string;
  const fields = readBookingFields(formData);
  const waiver = readWaiverFields(formData);
  const waiverIssue = waiverError(waiver);
  if (waiverIssue) {
    redirect(`/admin/book?error=${encodeURIComponent(waiverIssue)}`);
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", fields.petId)
    .single();

  if (!pet) redirect("/admin/book?error=Pet%20not%20found");

  const hasMembership = await petHasActiveMembership(supabase, fields.petId);
  const redeemablePack = fields.redeemCredit
    ? await findRedeemablePack(supabase, fields.petId, fields.service)
    : null;
  // Admin phone bookings don't draw from the sitewide promo pool or a
  // customer's saved coupon — instead the admin can type in whatever
  // one-off discount they want for this specific booking.
  const adminDiscountPercent =
    fields.adminDiscountType === "percent" ? fields.adminDiscountValue : 0;
  const adminDiscountAmount =
    fields.adminDiscountType === "amount" ? fields.adminDiscountValue : 0;
  const config = await getPricingConfig();
  const { price: priceBeforeDiscountAmount, addOns } = computeAppointmentPrice(
    pet,
    fields.service,
    fields.deshed,
    fields.creativeTier,
    fields.addOnNames,
    fields.packageTier,
    fields.standalone,
    fields.pickupDropoff,
    hasMembership,
    !!redeemablePack,
    adminDiscountPercent || null,
    config,
  );
  const subtotal = Math.max(
    0,
    Math.round((priceBeforeDiscountAmount - adminDiscountAmount) * 100) / 100,
  );
  const salesTax = calculateSalesTax(subtotal);
  const price = subtotal + salesTax;

  const inspoPhotoPath = await uploadInspoPhoto(supabase, customerId, formData);

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      customer_id: customerId,
      pet_id: fields.petId,
      service: fields.service,
      add_ons: addOns,
      appointment_date: fields.date,
      appointment_hour: fields.hour,
      payment_method: fields.paymentMethod,
      price,
      sales_tax: salesTax,
      customer_note: fields.customerNote,
      haircut_description: fields.haircutDescription,
      inspo_photo_path: inspoPhotoPath,
      pickup_dropoff: fields.pickupDropoff,
      pickup_address: fields.pickupAddress,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    redirect(
      `/admin/book?error=${encodeURIComponent(error?.message ?? "Could not book")}`,
    );
  }

  if (redeemablePack) {
    await redeemPackCredit(supabase, redeemablePack);
  }

  await insertWaiverSigning(supabase, {
    appointmentId: appointment.id,
    customerId,
    petId: fields.petId,
    waiver,
  });

  await sendBookingNotifications(supabase, {
    customerId,
    petId: fields.petId,
    petName: pet.name,
    appointmentId: appointment.id,
    date: fields.date,
    hour: fields.hour,
    rabiesVaccinePath: pet.rabies_vaccine_path,
    service: fields.service,
    price,
  });

  redirect("/admin?booked=1");
}
