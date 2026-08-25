"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { isDoodleMixBreed, isMinimalCoatDiscountBreed } from "@/lib/pricing/breeds";
import {
  advanceBookingDiscountAmount,
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
import {
  getCustomerCoupons,
  reserveCouponsForAppointment,
  releaseCouponsForAppointment,
} from "@/lib/coupons/actions";
import { getActivePromotion } from "@/lib/promotions/actions";
import { promotionAppliesToDate } from "@/lib/promotions/helpers";
import {
  isValidCancellationReason,
  type CancellationReason,
} from "@/lib/cancellation-reasons";
import {
  BOOKING_HOURS,
  MAX_NO_SHOWS,
  PICKUP_MIN_LEAD_HOURS,
} from "@/lib/booking-hours";
import {
  centralWallClockToInstant,
  formatDate,
  formatHour,
  todayInCentral,
} from "@/lib/format";
import { checkPickupEligibility } from "@/lib/geocoding";
import { logAppointmentHistory } from "@/lib/appointment-history";
import { notifyEmail, notifyText } from "@/lib/notifications/service";
import {
  BUSINESS_EMAIL,
  adminNewBookingEmail,
  appointmentConfirmedEmail,
  bookingConfirmationSms,
  checkoutAbandonedEmail,
  firstTimeWelcomeEmail,
  firstTimeWelcomeSms,
  newClientVaccineReminderSms,
  noCallNoShowWarningEmail,
  paymentLinkEmail,
} from "@/lib/notifications/templates";

interface PetRow {
  species: "dog" | "cat";
  breed: string;
  coat: "short" | "long";
  weight_lb: number;
  is_puppy?: boolean;
  is_kitten?: boolean;
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
  waterless: boolean = false,
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
            isDoodleMix: isDoodleMixBreed(pet.breed),
            isMinimalCoatBreed: isMinimalCoatDiscountBreed(pet.breed),
          },
          config,
        ).total
      : calculateCatPrice(
          {
            weightLb: pet.weight_lb,
            coat: pet.coat,
            service: service as CatServiceLevel,
            waterless,
            deshed,
            isKitten: pet.is_kitten ?? false,
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
    ...(waterless && pet.species === "cat" ? ["Waterless"] : []),
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
  if (service !== "bath" && service !== "trim" && service !== "haircut") return null;

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
    waterless: formData.get("waterless") === "true",
    creativeTier: (formData.get("creativeTier") as string) || "none",
    addOnNames: JSON.parse(
      (formData.get("addOnNames") as string) || "[]",
    ) as string[],
    packageTier: (formData.get("packageTier") as string) || "none",
    standalone: formData.get("standalone") === "true",
    date: formData.get("date") as string,
    hour: Number(formData.get("hour")),
    minute: Number(formData.get("minute")) || 0,
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
    minute = 0,
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
    minute?: number;
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
    time: formatHour(hour, minute),
  };

  await notifyText(
    supabase,
    target,
    "booking_confirmation",
    bookingConfirmationSms(vars),
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
      "customer_id, service, appointment_date, appointment_hour, appointment_minute, price, pets(name)",
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
      time: formatHour(appt.appointment_hour, appt.appointment_minute),
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
    .select("id, appointment_hour, service, duration_minutes, pets(species, weight_lb)")
    .eq("appointment_date", date)
    .neq("status", "cancelled");

  if (excludeAppointmentId) {
    query = query.neq("id", excludeAppointmentId);
  }

  const [{ data: appts }, { data: blocks }, config] = await Promise.all([
    query,
    supabase
      .from("blocked_slots")
      .select("blocked_hour")
      .eq("blocked_date", date),
    getPricingConfig(),
  ]);

  const rows = appts ?? [];
  const dayFull = rows.length >= config.maxAppointmentsPerDay;

  const bookedHours = new Set<number>();
  for (const row of rows) {
    bookedHours.add(row.appointment_hour as number);
    const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
    if (!pet) continue;
    // A manually-set duration (see setAppointmentDuration) overrides the
    // usual species/weight estimate entirely — if the admin says a groom
    // is really going to run 9am-12pm, that blocks the full 3 hours
    // regardless of what a typical appointment that size would take.
    const buffer = row.duration_minutes
      ? Math.ceil(row.duration_minutes / 60) - 1
      : bufferHoursFor(row.service, pet.species, pet.weight_lb);
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

  const [{ data: blocks }, { data: appts }, config] = await Promise.all([
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
    getPricingConfig(),
  ]);

  const unavailable = new Set((blocks ?? []).map((b) => b.blocked_date as string));

  const countByDate = new Map<string, number>();
  for (const a of appts ?? []) {
    const date = a.appointment_date as string;
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }
  for (const [date, count] of countByDate) {
    if (count >= config.maxAppointmentsPerDay) unavailable.add(date);
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

// Admin bookings skip bookingTimeError entirely (they can book in the past
// or on short notice on purpose), but a typed custom time still needs to
// land somewhere the database will actually accept — this just turns a raw
// constraint violation into a readable message.
function adminTimeRangeError(hour: number, minute: number): string | null {
  if (!Number.isInteger(hour) || hour < 6 || hour > 20) {
    return "Please choose an hour between 6 AM and 8 PM.";
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    return "Please enter a valid number of minutes (0–59).";
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
  if (service !== "bath" && service !== "trim" && service !== "haircut") return 0;

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
  // Personal coupons (admin-assigned, e.g. an apology discount, or redeemed
  // via a code) are opt-in, never automatic — the customer explicitly
  // chooses to apply them (see the "applyCoupon" checkbox in
  // booking-flow.tsx), same as redeeming a groom pack credit above. Every
  // coupon the customer currently has stacks together on top of whatever
  // sitewide promo is running. They're reserved against this appointment
  // now (so the same coupon can't be stacked onto a second booking while
  // this one's still pending payment) and only actually marked used once
  // this booking's payment confirms — see the Stripe webhook.
  const coupons = fields.applyCoupon ? await getCustomerCoupons(user.id) : [];
  const couponApplied = coupons.length > 0;
  const couponPercent = coupons.reduce((sum, c) => sum + (c.discountPercent ?? 0), 0);
  const couponAmount = coupons.reduce((sum, c) => sum + (c.discountAmount ?? 0), 0);
  const totalDiscountPercent = (promoDiscountPercent ?? 0) + couponPercent || null;
  const config = await getPricingConfig();

  // The UI already disables full days in the calendar/hour picker, but
  // that's advisory only — this is the actual hard stop, so a customer
  // can't slip past the daily cap by racing another booking or just
  // POSTing directly. Admin bookings (adminCreateAppointment) never call
  // this function at all, so they're unaffected by this limit.
  const { count: dayCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("appointment_date", fields.date)
    .neq("status", "cancelled");
  if ((dayCount ?? 0) >= config.maxAppointmentsPerDay) {
    redirect(
      `/book?error=${encodeURIComponent("That day is fully booked. Please pick another day.")}`,
    );
  }

  const advanceDiscount = advanceBookingDiscountAmount(config, fields.date);
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
    fields.waterless,
  );
  const subtotal = Math.max(
    0,
    Math.round((priceBeforeCouponAmount - couponAmount - advanceDiscount) * 100) / 100,
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
      appointment_minute: fields.minute,
      payment_method: "online",
      price,
      sales_tax: salesTax,
      customer_note: fields.customerNote,
      haircut_description: fields.haircutDescription,
      inspo_photo_path: inspoPhotoPath,
      pickup_dropoff: fields.pickupDropoff,
      pickup_address: fields.pickupAddress,
      promo_id: promoId,
      coupon_id: couponApplied ? coupons[0].id : null,
      advance_booking_discount: advanceDiscount,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    redirect(`/book?error=${encodeURIComponent(error?.message ?? "Could not book")}`);
  }

  if (couponApplied) {
    await reserveCouponsForAppointment(
      coupons.map((c) => c.id),
      appointment.id,
    );
  }

  await logAppointmentHistory(supabase, {
    appointmentId: appointment.id,
    action: "booked",
    actorType: "customer",
    actorId: user.id,
  });

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
    // {CHECKOUT_SESSION_ID} is a Stripe-substituted template value, giving
    // each real booking a unique success URL — lets the Meta Pixel dedupe a
    // completed-booking conversion event against a manual page refresh
    // without needing to strip the confirmation banner's own query params.
    `/account?booked=1&message=Payment+received.+Thank+you!&session_id={CHECKOUT_SESSION_ID}&value=${price}`,
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
  } else {
    const rangeIssue = adminTimeRangeError(fields.hour, fields.minute);
    if (rangeIssue) {
      redirect(`${editPath}?error=${encodeURIComponent(rangeIssue)}`);
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

  // Edits neither grant nor revoke a promo (or the advance booking
  // discount) — whatever this appointment already had (or didn't) at
  // booking time carries over as-is, at that promotion's original discount
  // rate, regardless of whether the date gets moved during the edit.
  const { data: existingAppt } = await supabase
    .from("appointments")
    .select("promo_id, advance_booking_discount")
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
  const advanceDiscount = existingAppt?.advance_booking_discount ?? 0;

  const hasMembership = await petHasActiveMembership(supabase, fields.petId);
  const redeemablePack = fields.redeemCredit
    ? await findRedeemablePack(supabase, fields.petId, fields.service)
    : null;
  const config = await getPricingConfig();
  // Only an admin editing can override price — same one-off adjustment
  // available when creating a booking, now also usable after the fact.
  const adminDiscountPercent =
    admin && fields.adminDiscountType === "percent" ? fields.adminDiscountValue : 0;
  const adminDiscountAmount =
    admin && fields.adminDiscountType === "amount" ? fields.adminDiscountValue : 0;
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
    (promoDiscountPercent ?? 0) + adminDiscountPercent || null,
    config,
    fields.waterless,
  );
  const subtotal =
    admin && fields.adminDiscountType === "exact"
      ? Math.max(0, fields.adminDiscountValue)
      : Math.max(
          0,
          Math.round(
            (priceBeforeDiscountAmount - adminDiscountAmount - advanceDiscount) * 100,
          ) / 100,
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
      appointment_minute: fields.minute,
      // Once an admin has touched an appointment's time, it's exempt from
      // the customer-only same-slot uniqueness check going forward — lets
      // the admin move it to intentionally overlap another appointment.
      ...(admin ? { admin_booked: true } : {}),
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

  await logAppointmentHistory(supabase, {
    appointmentId,
    action: "edited",
    actorType: admin ? "admin" : "customer",
    actorId: user.id,
  });

  redirect(admin ? "/admin?saved=1" : "/account?saved=1");
}

function appointmentDateTime(date: string, hour: number, minute: number = 0): Date {
  return centralWallClockToInstant(date, hour, minute);
}

export async function cancelAppointment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = await isAdminUser(supabase, user.id);
  const appointmentId = formData.get("appointmentId") as string;
  const reasonInput = (formData.get("reason") as string) || "";
  const editPath = admin ? `/admin/appointments/${appointmentId}` : `/account`;

  if (!isValidCancellationReason(reasonInput, admin)) {
    redirect(`${editPath}?error=${encodeURIComponent("Please choose a cancellation reason.")}`);
  }
  const reason = reasonInput as CancellationReason;
  // Only an admin cancelling as "No call, no show" ever counts as a real
  // no-show — a customer cancelling for any reason, even last-minute, is
  // proactively telling us, not disappearing on us.
  const noShow = admin && reason === "no_call_no_show";

  const { data: appt } = await supabase
    .from("appointments")
    .select("customer_id, pets(name), profiles:customer_id(full_name, phone)")
    .eq("id", appointmentId)
    .single();

  let query = supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      no_show: noShow,
      cancellation_reason: reason,
    })
    .eq("id", appointmentId);

  if (!admin) {
    query = query.eq("customer_id", user.id);
  }

  await query;

  // Any coupon reserved (but not yet spent — a payment never confirmed) for
  // this appointment goes back into the customer's available pool instead
  // of being stuck unusable forever.
  await releaseCouponsForAppointment(appointmentId);

  await logAppointmentHistory(supabase, {
    appointmentId,
    action: "cancelled",
    actorType: admin ? "admin" : "customer",
    actorId: user.id,
    note: reason,
  });

  if (noShow && appt) {
    const customerId = appt.customer_id as string;
    const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
    const profile = Array.isArray(appt.profiles) ? appt.profiles[0] : appt.profiles;
    const count = await getNoShowCount(supabase, customerId);

    if (count === 2 || count === 3) {
      if (count === 3) {
        await supabase
          .from("profiles")
          .update({ do_not_book: true })
          .eq("id", customerId);
      }
      await notifyEmail(
        supabase,
        { customerId, email: BUSINESS_EMAIL },
        "no_call_no_show_warning",
        noCallNoShowWarningEmail({
          customerName: profile?.full_name || "Unknown",
          customerPhone: profile?.phone ?? "",
          petName: pet?.name ?? "Pet",
          count,
          blocked: count === 3,
        }),
      );
    }
  }

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
    .select(
      "customer_id, appointment_date, appointment_hour, appointment_minute, pets(name)",
    )
    .single();

  if (appt) {
    await logAppointmentHistory(supabase, {
      appointmentId,
      action: "confirmed",
      actorType: admin ? "admin" : "customer",
      actorId: user.id,
    });

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
        time: formatHour(appt.appointment_hour, appt.appointment_minute),
      }),
    );
  }

  redirect(
    admin
      ? "/admin?message=Appointment+confirmed."
      : "/account?message=Appointment+confirmed.",
  );
}

// One-click switch from the admin schedule for an appointment that was
// booked "pay in person" (the admin-booking default) — flips it to online
// so the customer gets the "pay now" prompt the next time they log into
// their account. Only touches still-unpaid appointments, so it can't
// re-open something already settled.
export async function setAppointmentOnlinePayment(appointmentId: string) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("appointments")
    .update({ payment_method: "online" })
    .eq("id", appointmentId)
    .eq("payment_status", "unpaid");

  redirect("/admin?message=Switched+to+pay+online.");
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
  // Set for a deposit/remainder-balance link so the Stripe checkout page and
  // receipt read clearly (e.g. "50% Deposit"), and so the webhook knows this
  // isn't a full payment — see markAppointmentPaid.
  portionLabel?: string,
  paymentPortion?: "deposit" | "remainder",
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
            name: `${petName} · ${formatServiceLabel(service)}${portionLabel ? ` (${portionLabel})` : ""}`,
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
    metadata: paymentPortion ? { appointmentId, paymentPortion } : { appointmentId },
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
  // A deposit's already in — this self-serve flow always charges the full
  // price, which would double-bill on top of it. The remaining-balance
  // link for these is admin-sent instead (see sendPaymentLinkEmail).
  if (appt.payment_status === "deposit_paid") {
    redirect(
      "/account?error=A+deposit+is+already+on+file+for+this+appointment+%E2%80%94+we%27ll+email+you+a+link+for+the+remaining+balance.",
    );
  }

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

// One Checkout Session covering every unpaid upcoming appointment at once —
// used by the "Pay for your upcoming services?" account-page prompt, so a
// customer with several unpaid visits doesn't have to check out separately
// for each one. Each appointment's own (tax-inclusive) price becomes its own
// line item so the receipt still itemizes per pet/visit.
async function createBulkAppointmentCheckoutSession(
  origin: string | null,
  appointments: { id: string; petName: string; service: string; price: number }[],
  successPath: string,
  cancelPath: string,
): Promise<string | null> {
  if (!stripe) return null;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: appointments.map((appt) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${appt.petName} · ${formatServiceLabel(appt.service)}`,
          images: [`${origin}/logo.png`],
        },
        unit_amount: Math.round(appt.price * 100),
      },
      quantity: 1,
    })),
    // Comma-separated since Stripe metadata values are flat strings — see
    // the webhook's appointmentIdsRaw handling.
    metadata: { appointmentIds: appointments.map((a) => a.id).join(","), kind: "bulk_payment" },
    success_url: `${origin}${successPath}`,
    cancel_url: `${origin}${cancelPath}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
  return session.url;
}

export async function payAllUnpaidAppointmentsNow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const todayStr = todayInCentral();
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, price, service, payment_status, appointment_date, pets(name)")
    .eq("customer_id", user.id)
    .eq("payment_method", "online")
    .neq("status", "cancelled")
    // Deliberately excludes "deposit_paid", not just "paid"/"refunded" — a
    // full bulk charge here would double-bill for whatever's already been
    // collected as a deposit; the remaining-balance link for those is
    // admin-sent instead (see sendPaymentLinkEmail).
    .eq("payment_status", "unpaid")
    .gte("appointment_date", todayStr);

  const unpaid = appts ?? [];
  if (unpaid.length === 0) redirect("/account");

  if (!stripe) {
    redirect(
      "/account?error=Online+payment+isn%27t+set+up+yet+%E2%80%94+please+pay+in+person.",
    );
  }

  const origin = (await headers()).get("origin");
  const checkoutUrl = await createBulkAppointmentCheckoutSession(
    origin,
    unpaid.map((appt) => ({
      id: appt.id,
      petName: (Array.isArray(appt.pets) ? appt.pets[0] : appt.pets)?.name ?? "Pet",
      service: appt.service,
      price: appt.price,
    })),
    "/account?message=Payment+received.+Thank+you!",
    "/account",
  );

  if (!checkoutUrl) redirect("/account?error=Could%20not%20start%20checkout");
  redirect(checkoutUrl);
}

// Lets an admin email a Stripe payment link straight to a customer for an
// appointment booked on their behalf (e.g. a phone booking) instead of
// requiring them to log in and click "Pay Now" themselves.
export async function sendPaymentLinkEmail(appointmentId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const editPath = `/admin/appointments/${appointmentId}`;
  // "full" | "deposit" | "remainder" — deposit charges half now and leaves
  // the appointment in a new "deposit_paid" state; remainder collects
  // whatever's actually still owed once that deposit's in.
  const portion = (formData.get("portion") as string) || "full";

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, customer_id, price, sales_tax, amount_paid, service, appointment_date, appointment_hour, appointment_minute, payment_status, pets(name)",
    )
    .eq("id", appointmentId)
    .single();

  if (!appt) redirect(`${editPath}?error=Appointment%20not%20found`);
  if (appt.payment_status === "paid") {
    redirect(`${editPath}?message=${encodeURIComponent("This appointment is already paid.")}`);
  }
  if (portion === "remainder" && appt.payment_status !== "deposit_paid") {
    redirect(`${editPath}?error=${encodeURIComponent("No deposit has been paid yet.")}`);
  }
  if (portion !== "remainder" && appt.payment_status === "deposit_paid") {
    redirect(
      `${editPath}?error=${encodeURIComponent("A deposit is already paid — send the remaining balance link instead.")}`,
    );
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

  // A full payment splits subtotal/tax exactly as billed, same as always.
  // A deposit charges half of each so the tax line still reads sensibly on
  // the checkout page. The remainder just charges whatever's actually left
  // as one flat amount, so rounding from the deposit's half-split never
  // leaves a stray cent uncollected.
  let subtotal: number;
  let salesTax: number;
  let portionLabel: string | undefined;
  let paymentPortion: "deposit" | "remainder" | undefined;

  if (portion === "deposit") {
    subtotal = Math.round(((appt.price - appt.sales_tax) / 2) * 100) / 100;
    salesTax = Math.round((appt.sales_tax / 2) * 100) / 100;
    portionLabel = "50% Deposit";
    paymentPortion = "deposit";
  } else if (portion === "remainder") {
    subtotal = Math.max(0, Math.round((appt.price - appt.amount_paid) * 100) / 100);
    salesTax = 0;
    portionLabel = "Remaining Balance";
    paymentPortion = "remainder";
  } else {
    subtotal = appt.price - appt.sales_tax;
    salesTax = appt.sales_tax;
  }

  const checkoutUrl = await createAppointmentCheckoutSession(
    origin,
    appt.id,
    pet?.name ?? "Pet",
    appt.service,
    subtotal,
    salesTax,
    "/account?message=Payment+received.+Thank+you!",
    `/api/book/checkout-cancelled?appointmentId=${appt.id}`,
    24 * 60 * 60,
    portionLabel,
    paymentPortion,
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
      time: formatHour(appt.appointment_hour, appt.appointment_minute),
      amountDue: Math.round((subtotal + salesTax) * 100) / 100,
      totalPrice: appt.price,
      portion: paymentPortion,
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

// One-click full refund straight from the appointment page — refunds the
// actual Stripe charge (captured at payment time via the webhook), not
// just a local status flip, so the customer's card is genuinely credited.
export async function refundAppointmentPayment(appointmentId: string) {
  const { supabase } = await requireAdmin();
  const editPath = `/admin/appointments/${appointmentId}`;

  const { data: appt } = await supabase
    .from("appointments")
    .select("payment_status, stripe_payment_intent_id")
    .eq("id", appointmentId)
    .single();

  if (!appt) redirect(`${editPath}?error=Appointment%20not%20found`);
  if (appt.payment_status !== "paid") {
    redirect(`${editPath}?error=${encodeURIComponent("This appointment isn't marked paid.")}`);
  }
  if (!appt.stripe_payment_intent_id) {
    redirect(
      `${editPath}?error=${encodeURIComponent("No Stripe payment on record for this appointment — refund it directly in the Stripe dashboard instead.")}`,
    );
  }
  if (!stripe) {
    redirect(`${editPath}?error=${encodeURIComponent("Stripe isn't set up.")}`);
  }

  try {
    await stripe.refunds.create({ payment_intent: appt.stripe_payment_intent_id });
  } catch (err) {
    redirect(
      `${editPath}?error=${encodeURIComponent(err instanceof Error ? err.message : "Refund failed.")}`,
    );
  }

  await supabase
    .from("appointments")
    .update({ payment_status: "refunded" })
    .eq("id", appointmentId);

  redirect(`${editPath}?message=${encodeURIComponent("Refund issued.")}`);
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
    .select("id, customer_id, pets(name)")
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
    // kind: "tip" is what tells the webhook this is NOT an appointment
    // payment — both session types include appointmentId, so without this
    // flag a completed tip checkout gets misread as the appointment itself
    // being paid.
    metadata: { appointmentId: appt.id, customerId: appt.customer_id, kind: "tip" },
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
  const { supabase, user } = await requireAdmin();

  const customerId = formData.get("customerId") as string;
  const fields = readBookingFields(formData);
  // Lets a caller (e.g. the multi-pet booking page) bring the admin back to
  // itself instead of the generic /admin/book search page, so booking a
  // second pet for the same customer doesn't require re-navigating.
  const returnTo = ((formData.get("returnTo") as string) || "").trim() || null;
  const errorBase = returnTo ?? "/admin/book";
  const successBase = returnTo ?? "/admin";

  // Unlike a customer's own booking, the waiver is optional here — the
  // admin is often booking mid-phone-call with no way to have the customer
  // fill it out live. If it wasn't signed, the confirmation email links to
  // a standalone page so they can sign it before the visit instead.
  const waiver = readWaiverFields(formData);
  const waiverSigned = waiver.liabilityAccepted && waiver.signedName.trim() !== "";

  const rangeIssue = adminTimeRangeError(fields.hour, fields.minute);
  if (rangeIssue) {
    redirect(`${errorBase}?error=${encodeURIComponent(rangeIssue)}`);
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", fields.petId)
    .single();

  if (!pet) redirect(`${errorBase}?error=Pet%20not%20found`);

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
  const advanceDiscount = advanceBookingDiscountAmount(config, fields.date);
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
    fields.waterless,
  );
  // "Set exact price" bypasses all the computed-price math entirely — the
  // admin is directly asserting the total, not discounting off a computed
  // number.
  const subtotal =
    fields.adminDiscountType === "exact"
      ? Math.max(0, fields.adminDiscountValue)
      : Math.max(
          0,
          Math.round(
            (priceBeforeDiscountAmount - adminDiscountAmount - advanceDiscount) * 100,
          ) / 100,
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
      appointment_minute: fields.minute,
      admin_booked: true,
      payment_method: fields.paymentMethod,
      price,
      sales_tax: salesTax,
      customer_note: fields.customerNote,
      haircut_description: fields.haircutDescription,
      inspo_photo_path: inspoPhotoPath,
      pickup_dropoff: fields.pickupDropoff,
      pickup_address: fields.pickupAddress,
      advance_booking_discount: advanceDiscount,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    redirect(
      `${errorBase}?error=${encodeURIComponent(error?.message ?? "Could not book")}`,
    );
  }

  await logAppointmentHistory(supabase, {
    appointmentId: appointment.id,
    action: "booked",
    actorType: "admin",
    actorId: user.id,
  });

  if (redeemablePack) {
    await redeemPackCredit(supabase, redeemablePack);
  }

  if (waiverSigned) {
    await insertWaiverSigning(supabase, {
      appointmentId: appointment.id,
      customerId,
      petId: fields.petId,
      waiver,
    });
  }

  await sendBookingNotifications(supabase, {
    customerId,
    petId: fields.petId,
    petName: pet.name,
    appointmentId: appointment.id,
    date: fields.date,
    hour: fields.hour,
    minute: fields.minute,
    rabiesVaccinePath: pet.rabies_vaccine_path,
    service: fields.service,
    price,
  });

  redirect(`${successBase}?booked=${encodeURIComponent(pet.name)}`);
}

// Reached from the "sign the waiver" link in the booking confirmation
// email when an admin phone booking went through without one — public, no
// login, since it's a one-tap link like leave-a-review.
export async function signAppointmentWaiver(formData: FormData) {
  const appointmentId = formData.get("appointmentId") as string;
  const waiver = readWaiverFields(formData);
  const waiverIssue = waiverError(waiver);
  if (waiverIssue) {
    redirect(
      `/sign-waiver/${appointmentId}?error=${encodeURIComponent(waiverIssue)}`,
    );
  }

  const supabase = createServiceClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, customer_id, pet_id")
    .eq("id", appointmentId)
    .single();

  if (!appointment) {
    redirect(
      `/sign-waiver/${appointmentId}?error=${encodeURIComponent("Appointment not found.")}`,
    );
  }

  await insertWaiverSigning(supabase, {
    appointmentId: appointment.id,
    customerId: appointment.customer_id,
    petId: appointment.pet_id,
    waiver,
  });

  redirect(`/sign-waiver/${appointmentId}?signed=1`);
}
