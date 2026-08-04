import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  alreadyNotifiedForAppointment,
  alreadyNotifiedForCustomer,
  alreadyNotifiedForPetSince,
  notifyEmail,
  notifyText,
} from "@/lib/notifications/service";
import { formatHour } from "@/lib/format";
import {
  BUSINESS_EMAIL,
  postVisitThankYouSms,
  rebooking16wkSms,
  rebooking8wkEmail,
  rebooking8wkSms,
  reminder24hSms,
  reviewRequestEmail,
  reviewRequestSms,
  signupNoBookingEmail,
  vaccinationExpiredSms,
  vaccinationExpiringSms,
} from "@/lib/notifications/templates";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(dateStr: string, n: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(dateStr: string) {
  const then = new Date(`${dateStr}T00:00:00Z`).getTime();
  const now = new Date(`${todayISO()}T00:00:00Z`).getTime();
  return Math.round((now - then) / DAY_MS);
}

interface AppointmentWithContact {
  id: string;
  customer_id: string;
  appointment_date: string;
  appointment_hour: number;
  pets: { id: string; name: string } | { id: string; name: string }[] | null;
  profiles:
    | { full_name: string | null; phone: string | null; email: string | null }
    | { full_name: string | null; phone: string | null; email: string | null }[]
    | null;
}

function one<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);

  const results = {
    reminder24h: 0,
    postVisitThankYou: 0,
    reviewRequest: 0,
    vaccinationExpiring: 0,
    vaccinationExpired: 0,
    rebooking8wk: 0,
    rebooking16wk: 0,
    signupNoBooking: 0,
    deletedOldAppointments: 0,
  };

  // 1. 24-hour reminder
  const { data: tomorrowAppts } = await supabase
    .from("appointments")
    .select("id, customer_id, appointment_date, appointment_hour, pets(id, name), profiles:customer_id(full_name, phone, email)")
    .eq("appointment_date", tomorrow)
    .neq("status", "cancelled");

  for (const appt of (tomorrowAppts ?? []) as unknown as AppointmentWithContact[]) {
    if (await alreadyNotifiedForAppointment(supabase, appt.id, "reminder_24h")) continue;
    const pet = one(appt.pets);
    const profile = one(appt.profiles);
    if (!pet) continue;
    const target = {
      customerId: appt.customer_id,
      petId: pet.id,
      appointmentId: appt.id,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
    };
    const vars = {
      firstName: (profile?.full_name || "there").split(" ")[0],
      petName: pet.name,
      time: formatHour(appt.appointment_hour),
    };
    await notifyText(supabase, target, "reminder_24h", reminder24hSms(vars));
    results.reminder24h++;
  }

  // 2. Post-visit thank you (day after the appointment)
  const { data: yesterdayAppts } = await supabase
    .from("appointments")
    .select("id, customer_id, appointment_date, appointment_hour, pets(id, name), profiles:customer_id(full_name, phone, email)")
    .eq("appointment_date", yesterday)
    .neq("status", "cancelled");

  for (const appt of (yesterdayAppts ?? []) as unknown as AppointmentWithContact[]) {
    if (await alreadyNotifiedForAppointment(supabase, appt.id, "post_visit_thank_you")) continue;
    const pet = one(appt.pets);
    const profile = one(appt.profiles);
    if (!pet) continue;
    const target = {
      customerId: appt.customer_id,
      petId: pet.id,
      appointmentId: appt.id,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
    };
    await notifyText(
      supabase,
      target,
      "post_visit_thank_you",
      postVisitThankYouSms({ petName: pet.name }),
    );
    results.postVisitThankYou++;
  }

  // 3. Review request (two days after the appointment)
  const { data: reviewAppts } = await supabase
    .from("appointments")
    .select("id, customer_id, appointment_date, appointment_hour, pets(id, name), profiles:customer_id(full_name, phone, email)")
    .eq("appointment_date", twoDaysAgo)
    .neq("status", "cancelled");

  for (const appt of (reviewAppts ?? []) as unknown as AppointmentWithContact[]) {
    if (await alreadyNotifiedForAppointment(supabase, appt.id, "review_request")) continue;
    const pet = one(appt.pets);
    const profile = one(appt.profiles);
    if (!pet) continue;
    const target = {
      customerId: appt.customer_id,
      petId: pet.id,
      appointmentId: appt.id,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
    };
    const vars = {
      firstName: (profile?.full_name || "there").split(" ")[0],
      petName: pet.name,
    };
    await notifyText(supabase, target, "review_request", reviewRequestSms(vars));
    await notifyEmail(supabase, target, "review_request", reviewRequestEmail(vars));
    results.reviewRequest++;
  }

  // 4. Vaccination expiring (30 days out) / expired — uses the actual
  // expiration date entered at upload, not an estimate.
  const { data: petsWithVaccine } = await supabase
    .from("pets")
    .select(
      "id, name, owner_id, rabies_uploaded_at, rabies_expires_at, profiles:owner_id(full_name, phone, email)",
    )
    .not("rabies_expires_at", "is", null);

  for (const pet of petsWithVaccine ?? []) {
    const uploadedAt = (pet.rabies_uploaded_at as string) ?? pet.rabies_expires_at;
    const expiry = new Date(`${pet.rabies_expires_at}T00:00:00Z`);
    const daysUntilExpiry = Math.round((expiry.getTime() - Date.now()) / DAY_MS);
    const profile = one(
      pet.profiles as
        | { full_name: string | null; phone: string | null; email: string | null }
        | { full_name: string | null; phone: string | null; email: string | null }[]
        | null,
    );
    const target = {
      customerId: pet.owner_id,
      petId: pet.id,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
    };
    const vars = {
      firstName: (profile?.full_name || "there").split(" ")[0],
      petName: pet.name,
    };

    if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
      if (
        !(await alreadyNotifiedForPetSince(
          supabase,
          pet.id,
          "vaccination_expiring",
          uploadedAt,
        ))
      ) {
        await notifyText(supabase, target, "vaccination_expiring", vaccinationExpiringSms(vars));
        results.vaccinationExpiring++;
      }
    } else if (daysUntilExpiry < 0) {
      if (
        !(await alreadyNotifiedForPetSince(
          supabase,
          pet.id,
          "vaccination_expired",
          uploadedAt,
        ))
      ) {
        await notifyText(supabase, target, "vaccination_expired", vaccinationExpiredSms(vars));
        results.vaccinationExpired++;
      }
    }
  }

  // 5. Rebooking reminders (8 weeks, then a final one at 16 weeks) for pets
  // with no upcoming appointment scheduled.
  const { data: allAppts } = await supabase
    .from("appointments")
    .select("pet_id, appointment_date, status");

  const { data: allPets } = await supabase
    .from("pets")
    .select("id, name, owner_id, profiles:owner_id(full_name, phone, email)");

  const apptsByPet = new Map<string, { date: string; status: string }[]>();
  for (const a of allAppts ?? []) {
    const list = apptsByPet.get(a.pet_id) ?? [];
    list.push({ date: a.appointment_date, status: a.status });
    apptsByPet.set(a.pet_id, list);
  }

  for (const pet of allPets ?? []) {
    const history = apptsByPet.get(pet.id) ?? [];
    const hasUpcoming = history.some(
      (a) => a.date >= today && a.status !== "cancelled",
    );
    if (hasUpcoming) continue;

    const pastDates = history
      .filter((a) => a.date < today && a.status !== "cancelled")
      .map((a) => a.date)
      .sort();
    const lastDate = pastDates[pastDates.length - 1];
    if (!lastDate) continue;

    const gap = daysAgo(lastDate);
    const profile = one(
      pet.profiles as
        | { full_name: string | null; phone: string | null; email: string | null }
        | { full_name: string | null; phone: string | null; email: string | null }[]
        | null,
    );
    const target = {
      customerId: pet.owner_id,
      petId: pet.id,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
    };
    const vars = {
      firstName: (profile?.full_name || "there").split(" ")[0],
      petName: pet.name,
    };

    if (gap >= 56 && gap < 112) {
      if (
        !(await alreadyNotifiedForPetSince(supabase, pet.id, "rebooking_8wk", lastDate))
      ) {
        await notifyText(supabase, target, "rebooking_8wk", rebooking8wkSms(vars));
        await notifyEmail(supabase, target, "rebooking_8wk", rebooking8wkEmail(vars));
        results.rebooking8wk++;
      }
    } else if (gap >= 112) {
      if (
        !(await alreadyNotifiedForPetSince(supabase, pet.id, "rebooking_16wk", lastDate))
      ) {
        await notifyText(supabase, target, "rebooking_16wk", rebooking16wkSms(vars));
        results.rebooking16wk++;
      }
    }
  }

  // 6. Signed up but never booked — a one-time admin nudge, 24 hours after
  // account creation, for customers with zero appointments ever (booked
  // then abandoned is a separate signal, already covered by the checkout-
  // abandonment alert, so this only looks at truly zero appointment rows).
  const oneDayAgoISO = new Date(Date.now() - DAY_MS).toISOString();
  const { data: candidateProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, created_at")
    .eq("role", "customer")
    .lte("created_at", oneDayAgoISO);

  const { data: everBookedRows } = await supabase
    .from("appointments")
    .select("customer_id");
  const everBookedIds = new Set((everBookedRows ?? []).map((a) => a.customer_id));

  for (const profile of candidateProfiles ?? []) {
    if (everBookedIds.has(profile.id)) continue;
    if (await alreadyNotifiedForCustomer(supabase, profile.id, "admin_signup_no_booking")) {
      continue;
    }

    await notifyEmail(
      supabase,
      { customerId: profile.id, email: BUSINESS_EMAIL },
      "admin_signup_no_booking",
      signupNoBookingEmail({
        customerName: profile.full_name || "Unknown",
        customerPhone: profile.phone ?? "",
        customerEmail: profile.email ?? "",
        signedUpAt: new Date(profile.created_at).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
      }),
    );
    results.signupNoBooking++;
  }

  // 7. Prune appointments older than a year — private groom_notes reference
  // appointments with "on delete set null", so grooming history per pet is
  // preserved even after the appointment row itself is gone.
  const oneYearAgo = addDays(today, -365);
  const { data: deletedOld } = await supabase
    .from("appointments")
    .delete()
    .lt("appointment_date", oneYearAgo)
    .select("id");
  results.deletedOldAppointments = deletedOld?.length ?? 0;

  return NextResponse.json({ ok: true, date: today, results });
}
