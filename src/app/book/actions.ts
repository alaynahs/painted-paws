"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import {
  calculateCatPrice,
  calculateCreativePrice,
  calculateDogPrice,
  catWeightClass,
  CAT_ADD_ONS,
  CREATIVE_TIER_LABELS,
  dogWeightClass,
  DOG_ADD_ONS,
  formatServiceLabel,
  PACKAGE_LABELS,
  PACKAGE_PRICES,
  type CatServiceLevel,
  type CreativeTier,
  type DogBookingService,
  type PackageTier,
} from "@/lib/pricing/pricing";
import { BOOKING_HOURS, MAX_APPOINTMENTS_PER_DAY } from "@/lib/booking-hours";
import { formatDate, formatHour } from "@/lib/format";
import { notifyEmail, notifyText } from "@/lib/notifications/service";
import {
  BUSINESS_EMAIL,
  adminNewBookingEmail,
  appointmentConfirmedEmail,
  bookingConfirmationEmail,
  bookingConfirmationSms,
  firstTimeWelcomeEmail,
  firstTimeWelcomeSms,
  newClientVaccineReminderSms,
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
) {
  if (standalone) {
    const catalog = pet.species === "dog" ? DOG_ADD_ONS : CAT_ADD_ONS;
    const selectedAddOns = catalog.filter((a) => addOnNames.includes(a.name));
    return {
      price: selectedAddOns.reduce((sum, a) => sum + a.price, 0),
      addOns: selectedAddOns.map((a) => a.name),
    };
  }

  const result =
    pet.species === "dog"
      ? calculateDogPrice({
          weightLb: pet.weight_lb,
          coat: pet.coat,
          service: service as DogBookingService,
          isPuppy: pet.is_puppy ?? false,
          isDoodle: false,
          deshed,
        })
      : calculateCatPrice({
          weightLb: pet.weight_lb,
          coat: pet.coat,
          service: service as CatServiceLevel,
          waterless: false,
          deshed,
        });

  const creativeAddOnPrice =
    creativeTier !== "none" && pet.species === "dog"
      ? calculateCreativePrice(creativeTier as CreativeTier, pet.weight_lb)
      : 0;

  const catalog = pet.species === "dog" ? DOG_ADD_ONS : CAT_ADD_ONS;
  const selectedAddOns = catalog.filter((a) => addOnNames.includes(a.name));
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);

  const packagePrice =
    packageTier !== "none" ? PACKAGE_PRICES[packageTier as PackageTier] : 0;

  const labels = [
    ...(deshed ? ["De-shed treatment"] : []),
    ...(creativeTier !== "none"
      ? [CREATIVE_TIER_LABELS[creativeTier as CreativeTier]]
      : []),
    ...selectedAddOns.map((a) => a.name),
    ...(packageTier !== "none"
      ? [PACKAGE_LABELS[packageTier as PackageTier]]
      : []),
  ];

  return {
    price: result.total + creativeAddOnPrice + addOnsTotal + packagePrice,
    addOns: labels,
  };
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
    vaccinesCurrent: formData.get("waiverVaccinesCurrent") === "true",
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
    return "Pets vaccinated in the last 24 hours can't be groomed yet — please pick a later date.";
  }
  if (!w.vaccinesCurrent) {
    return "Your pet must be current on all required vaccinations to book.";
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
    vaccines_current: waiver.vaccinesCurrent,
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

async function sendBookingNotifications(
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

export async function createAppointment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fields = readBookingFields(formData);
  const waiver = readWaiverFields(formData);
  const waiverIssue = waiverError(waiver);
  if (waiverIssue) {
    redirect(`/book?error=${encodeURIComponent(waiverIssue)}`);
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", fields.petId)
    .single();

  if (!pet) redirect("/book?error=Pet%20not%20found");

  const { price, addOns } = computeAppointmentPrice(
    pet,
    fields.service,
    fields.deshed,
    fields.creativeTier,
    fields.addOnNames,
    fields.packageTier,
    fields.standalone,
  );

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
      payment_method: fields.paymentMethod,
      price,
      customer_note: fields.customerNote,
      haircut_description: fields.haircutDescription,
      inspo_photo_path: inspoPhotoPath,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    redirect(`/book?error=${encodeURIComponent(error?.message ?? "Could not book")}`);
  }

  await insertWaiverSigning(supabase, {
    appointmentId: appointment.id,
    customerId: user.id,
    petId: fields.petId,
    waiver,
  });

  await sendBookingNotifications(supabase, {
    customerId: user.id,
    petId: fields.petId,
    petName: pet.name,
    appointmentId: appointment.id,
    date: fields.date,
    hour: fields.hour,
    rabiesVaccinePath: pet.rabies_vaccine_path,
    service: fields.service,
    price,
  });

  redirect("/account?booked=1");
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

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", fields.petId)
    .single();

  if (!pet) {
    redirect(`${editPath}?error=Pet%20not%20found`);
  }

  const { price, addOns } = computeAppointmentPrice(
    pet,
    fields.service,
    fields.deshed,
    fields.creativeTier,
    fields.addOnNames,
    fields.packageTier,
    fields.standalone,
  );

  let query = supabase
    .from("appointments")
    .update({
      service: fields.service,
      add_ons: addOns,
      appointment_date: fields.date,
      appointment_hour: fields.hour,
      payment_method: fields.paymentMethod,
      price,
      customer_note: fields.customerNote,
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

export async function cancelAppointment(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = await isAdminUser(supabase, user.id);

  let query = supabase
    .from("appointments")
    .update({ status: "cancelled" })
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

export async function payAppointmentNow(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, price, service, payment_status, pets(name)")
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

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${pet?.name ?? "Pet"} — ${formatServiceLabel(appt.service)}`,
            // Stripe fetches this from its own servers, so it only renders
            // once this image is reachable at a real public URL (i.e. once
            // the site is deployed, not while testing on localhost).
            images: [`${origin}/checkout-photo.jpg`],
          },
          unit_amount: Math.round(appt.price * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { appointmentId: appt.id },
    success_url: `${origin}/account?message=Payment+received.+Thank+you!`,
    cancel_url: `${origin}/account?message=Payment+cancelled.`,
  });

  if (!session.url) redirect("/account?error=Could%20not%20start%20checkout");
  redirect(session.url);
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

export async function searchCustomersByPhone(phone: string) {
  const { supabase } = await requireAdmin();
  const digits = phone.replace(/\D/g, "");
  if (!digits) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .ilike("phone", `%${digits}%`);

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

  const { price, addOns } = computeAppointmentPrice(
    pet,
    fields.service,
    fields.deshed,
    fields.creativeTier,
    fields.addOnNames,
    fields.packageTier,
    fields.standalone,
  );

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
      customer_note: fields.customerNote,
      haircut_description: fields.haircutDescription,
      inspo_photo_path: inspoPhotoPath,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    redirect(
      `/admin/book?error=${encodeURIComponent(error?.message ?? "Could not book")}`,
    );
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
