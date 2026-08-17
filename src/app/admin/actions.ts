"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/supabase/admin";
import { getPricingConfig } from "@/lib/pricing/config";
import { notifyEmail, type NotificationType } from "@/lib/notifications/service";
import type { QuickMessageType } from "@/lib/notifications/quick-message-labels";
import {
  cantReachClientEmail,
  leaveReviewOrTipEmail,
  mobileDropoffOnWayEmail,
  mobilePickupArrivedEmail,
  mobilePickupOnWayEmail,
  noResponseWarningEmail,
  pickup15MinEmail,
  pickupReadyEmail,
  postVisitReviewOnlyEmail,
  postVisitThankYouEmail,
} from "@/lib/notifications/templates";
import { formatDate, formatHour } from "@/lib/format";

// Marks a pet inactive (e.g. after they've passed away) so they no longer
// show up as a bookable option — their profile and history stay intact.
export async function setPetActive(petId: string, isActive: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("pets").update({ is_active: isActive }).eq("id", petId);
  revalidatePath(`/admin/pets/${petId}`);
}

// Blocks (or unblocks) a customer's whole account from booking online,
// independent of the automatic no-show-count block — for cases like an
// incident where they shouldn't be allowed back, regardless of which pet.
export async function setCustomerDoNotBook(
  customerId: string,
  doNotBook: boolean,
  petId: string,
) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ do_not_book: doNotBook })
    .eq("id", customerId);
  revalidatePath(`/admin/pets/${petId}`);
}

// Blocks (or unblocks) just this one pet from booking online — e.g. a pet
// who's become impossible to safely groom, while the pet parent themselves
// is still welcome back (with this or another pet, in person/by phone).
export async function setPetDoNotBook(petId: string, doNotBook: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("pets").update({ do_not_book: doNotBook }).eq("id", petId);
  revalidatePath(`/admin/pets/${petId}`);
}

function sanitizeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
}

export async function addGroomNote(formData: FormData) {
  const { supabase } = await requireAdmin();

  const petId = formData.get("petId") as string;
  const noteType = formData.get("noteType") as string;
  const note = ((formData.get("note") as string) || "").trim();
  const rating = formData.get("rating") === "caution" ? "caution" : null;
  const file = formData.get("photo") as File | null;
  const hasPhoto = !!file && file.size > 0;
  const editPath = `/admin/pets/${petId}`;

  if (!note && !hasPhoto) {
    redirect(`${editPath}?error=${encodeURIComponent("Enter a note or attach a photo first.")}`);
  }

  let photoPath: string | null = null;
  if (hasPhoto) {
    const storagePath = `${petId}/${randomUUID()}-${sanitizeFileName(file!.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("groom-note-photos")
      .upload(storagePath, file!, { contentType: file!.type });
    if (uploadError) {
      redirect(
        `${editPath}?error=${encodeURIComponent(`Photo didn't upload: ${uploadError.message}`)}`,
      );
    }
    photoPath = storagePath;
  }

  const { error: insertError } = await supabase.from("groom_notes").insert({
    pet_id: petId,
    note_type: noteType,
    note,
    photo_path: photoPath,
    rating,
  });
  if (insertError) {
    redirect(`${editPath}?error=${encodeURIComponent(`Note didn't save: ${insertError.message}`)}`);
  }

  revalidatePath(editPath);
  revalidatePath("/admin/grid");
  redirect(`${editPath}?message=Note+saved.`);
}

// The photo (if any) is deleted from storage first, best-effort — if that
// fails the note itself still gets deleted rather than leaving an orphaned
// note the admin can't get rid of over a storage hiccup.
export async function deleteGroomNote(noteId: string, petId: string) {
  const { supabase } = await requireAdmin();
  const editPath = `/admin/pets/${petId}`;

  const { data: note } = await supabase
    .from("groom_notes")
    .select("photo_path")
    .eq("id", noteId)
    .single();

  if (note?.photo_path) {
    await supabase.storage.from("groom-note-photos").remove([note.photo_path]);
  }

  const { error } = await supabase.from("groom_notes").delete().eq("id", noteId);
  if (error) {
    redirect(`${editPath}?error=${encodeURIComponent(`Couldn't delete note: ${error.message}`)}`);
  }

  revalidatePath(editPath);
  revalidatePath("/admin/grid");
  redirect(`${editPath}?message=Note+deleted.`);
}

// Photos taken during/after a groom, uploaded by the admin, visible to the
// pet's owner on their account. Multiple photos per pet are expected (one
// per visit), unlike the single-file-per-pet rabies vaccine upload.
export async function uploadGroomPhoto(formData: FormData) {
  const { supabase } = await requireAdmin();

  const petId = formData.get("petId") as string;
  const caption = ((formData.get("caption") as string) || "").trim() || null;
  const appointmentId = ((formData.get("appointmentId") as string) || "") || null;
  const file = formData.get("file") as File;

  if (!file || file.size === 0) {
    redirect(
      `/admin/pets/${petId}?error=${encodeURIComponent("Choose a photo to upload.")}`,
    );
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("owner_id")
    .eq("id", petId)
    .single();

  if (!pet) redirect(`/admin/pets/${petId}?error=${encodeURIComponent("Pet not found.")}`);

  const storagePath = `${pet.owner_id}/${petId}/${randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("groom-photos")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    redirect(`/admin/pets/${petId}?error=${encodeURIComponent(uploadError.message)}`);
  }

  await supabase.from("groom_photos").insert({
    pet_id: petId,
    customer_id: pet.owner_id,
    appointment_id: appointmentId,
    storage_path: storagePath,
    caption,
  });

  revalidatePath(`/admin/pets/${petId}`);
  revalidatePath(`/account/pets/${petId}`);
}

// Lets the admin upload a rabies vaccine record for a customer's pet
// directly — e.g. a client texts/emails a photo instead of uploading it
// themselves through their account. Same storage path convention and pets
// columns as the customer-facing upload in account/pets/actions.ts. The PDF
// itself is optional here (unlike the customer-facing version) — the admin
// may just be recording an expiration date she was told over the phone/in
// person, with no file on hand to attach.
export async function uploadRabiesVaccineAdmin(formData: FormData) {
  const { supabase } = await requireAdmin();

  const petId = formData.get("petId") as string;
  const file = formData.get("file") as File | null;
  const hasFile = !!file && file.size > 0;
  const expiresAt = formData.get("expiresAt") as string;

  if (!expiresAt) {
    redirect(
      `/admin/pets/${petId}?error=${encodeURIComponent("Enter the vaccine's expiration date.")}`,
    );
  }

  const update: {
    rabies_expires_at: string;
    rabies_uploaded_at: string;
    rabies_vaccine_path?: string;
  } = {
    rabies_expires_at: expiresAt,
    rabies_uploaded_at: new Date().toISOString(),
  };

  if (hasFile) {
    const { data: pet } = await supabase
      .from("pets")
      .select("owner_id")
      .eq("id", petId)
      .single();

    if (!pet) redirect(`/admin/pets/${petId}?error=${encodeURIComponent("Pet not found.")}`);

    const path = `${pet.owner_id}/${petId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("vaccine-records")
      .upload(path, file, { upsert: true, contentType: "application/pdf" });

    if (uploadError) {
      redirect(`/admin/pets/${petId}?error=${encodeURIComponent(uploadError.message)}`);
    }

    update.rabies_vaccine_path = path;
  }

  await supabase.from("pets").update(update).eq("id", petId);

  revalidatePath(`/admin/pets/${petId}`);
  revalidatePath(`/account/pets/${petId}`);
  redirect(`/admin/pets/${petId}?saved=1`);
}

export async function deleteGroomPhoto(photoId: string, petId: string) {
  const { supabase } = await requireAdmin();

  const { data: photo } = await supabase
    .from("groom_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  await supabase.from("groom_photos").delete().eq("id", photoId);
  if (photo) {
    await supabase.storage.from("groom-photos").remove([photo.storage_path]);
  }

  revalidatePath(`/admin/pets/${petId}`);
  revalidatePath(`/account/pets/${petId}`);
}

interface AppointmentContact {
  id: string;
  customer_id: string;
  appointment_date: string;
  appointment_hour: number;
  appointment_minute: number;
  pets: { id: string; name: string } | { id: string; name: string }[] | null;
  profiles:
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null;
}

function one<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export async function sendQuickMessage(formData: FormData) {
  const { supabase } = await requireAdmin();
  const appointmentId = formData.get("appointmentId") as string;
  const type = formData.get("type") as QuickMessageType;
  const extra = (formData.get("extra") as string) || "";

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, customer_id, appointment_date, appointment_hour, appointment_minute, pets(id, name), profiles:customer_id(full_name, email)",
    )
    .eq("id", appointmentId)
    .single();

  const appt = data as AppointmentContact | null;
  if (!appt) return;
  const pet = one(appt.pets);
  const profile = one(appt.profiles);
  if (!pet) return;

  const target = {
    customerId: appt.customer_id,
    petId: pet.id,
    appointmentId: appt.id,
    email: profile?.email ?? null,
  };
  const vars = {
    firstName: (profile?.full_name || "there").split(" ")[0],
    petName: pet.name,
  };

  let content: { subject: string; body: string };
  switch (type) {
    case "pickup_15min": {
      const config = await getPricingConfig();
      content = pickup15MinEmail({
        ...vars,
        advanceDiscountAmount: config.advanceBookingDiscount.active
          ? config.advanceBookingDiscount.amount
          : undefined,
        advanceDiscountMinLeadWeeks: config.advanceBookingDiscount.active
          ? config.advanceBookingDiscount.minLeadWeeks
          : undefined,
      });
      break;
    }
    case "pickup_ready":
      content = pickupReadyEmail(vars);
      break;
    case "pickup_on_way":
      content = mobilePickupOnWayEmail({ ...vars, eta: extra || "15 minutes" });
      break;
    case "pickup_arrived":
      content = mobilePickupArrivedEmail(vars);
      break;
    case "pickup_cant_reach":
      content = cantReachClientEmail({ ...vars, waitMinutes: extra || "10" });
      break;
    case "dropoff_on_way":
      content = mobileDropoffOnWayEmail({ ...vars, eta: extra || "15 minutes" });
      break;
    case "no_response_warning":
      content = noResponseWarningEmail({
        ...vars,
        date: formatDate(appt.appointment_date),
        time: formatHour(appt.appointment_hour, appt.appointment_minute),
      });
      break;
    case "leave_review_or_tip": {
      const origin = (await headers()).get("origin");
      content = leaveReviewOrTipEmail({
        ...vars,
        reviewUrl: `${origin}/leave-a-review/${appt.id}`,
      });
      break;
    }
    default:
      return;
  }

  await notifyEmail(supabase, target, type as NotificationType, content);
}

// Marks the visit done and emails the pet parent the tip/review page link.
// Texting isn't fully set up yet, so this is email-only for now — the same
// notifications_log type ("post_visit_thank_you") is ready for an SMS
// counterpart whenever that's wired up.
interface AppointmentEmailContact {
  id: string;
  customer_id: string;
  pickup_dropoff: boolean;
  pets: { id: string; name: string } | { id: string; name: string }[] | null;
  profiles:
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null;
}

export async function markAppointmentComplete(
  appointmentId: string,
  includeTip: boolean,
) {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, customer_id, pickup_dropoff, pets(id, name), profiles:customer_id(full_name, email)",
    )
    .eq("id", appointmentId)
    .single();

  const appt = data as AppointmentEmailContact | null;
  if (!appt) redirect("/admin");

  const pet = one(appt.pets);
  const profile = one(appt.profiles);

  await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointmentId);

  if (profile?.email) {
    const origin = (await headers()).get("origin");
    const emailVars = {
      firstName: (profile.full_name || "there").split(" ")[0],
      petName: pet?.name ?? "Your pet",
      reviewUrl: `${origin}/leave-a-review/${appt.id}${includeTip ? "" : "?notip=1"}`,
      pickupDropoff: appt.pickup_dropoff,
    };
    await notifyEmail(
      supabase,
      {
        customerId: appt.customer_id,
        petId: pet?.id ?? null,
        appointmentId: appt.id,
        email: profile.email,
      },
      "post_visit_thank_you",
      includeTip ? postVisitThankYouEmail(emailVars) : postVisitReviewOnlyEmail(emailVars),
    );
  }

  redirect(
    `/admin/appointments/${appointmentId}?message=${encodeURIComponent(
      profile?.email
        ? `Marked complete — ${includeTip ? "review + tip" : "review"} email sent.`
        : "Marked complete — no email on file to notify.",
    )}`,
  );
}

// For in-person payments, which never touch Stripe and so never get flipped
// to "paid" by the webhook automatically — lets cash/card-in-hand payments
// actually count toward the revenue report instead of sitting unpaid
// forever.
export async function markAppointmentPaid(appointmentId: string) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("appointments")
    .update({ payment_status: "paid" })
    .eq("id", appointmentId);
  revalidatePath(`/admin/appointments/${appointmentId}`);
  redirect(`/admin/appointments/${appointmentId}?message=Marked+paid.`);
}

// Overrides the estimated duration used to block off following time slots
// (see getBookedHours/bufferHoursFor in book/actions.ts) — e.g. the admin
// knows a particular groom is really going to run 9am-12pm, longer than
// that service/size would normally take. An empty value clears the
// override and falls back to the usual estimate.
export async function setAppointmentDuration(formData: FormData) {
  const appointmentId = formData.get("appointmentId") as string;
  const hoursRaw = (formData.get("durationHours") as string) || "";
  const editPath = `/admin/appointments/${appointmentId}`;
  const { supabase } = await requireAdmin();

  const hours = hoursRaw.trim() === "" ? null : Number(hoursRaw);
  if (hours !== null && (!Number.isFinite(hours) || hours <= 0)) {
    redirect(`${editPath}?error=${encodeURIComponent("Enter a valid number of hours, or leave it blank to use the default.")}`);
  }

  await supabase
    .from("appointments")
    .update({ duration_minutes: hours === null ? null : Math.round(hours * 60) })
    .eq("id", appointmentId);

  revalidatePath(editPath);
  revalidatePath("/admin/grid");
  redirect(`${editPath}?message=${encodeURIComponent(hours === null ? "Duration reset to default." : "Duration updated.")}`);
}

export async function addBlockedSlot(formData: FormData) {
  const { supabase } = await requireAdmin();

  const date = formData.get("date") as string;
  const wholeDay = formData.get("wholeDay") === "true";
  const hourRaw = formData.get("hour") as string;
  const reason = ((formData.get("reason") as string) || "").trim() || null;

  if (!date) return;

  await supabase.from("blocked_slots").insert({
    blocked_date: date,
    blocked_hour: wholeDay ? null : Number(hourRaw),
    reason,
  });

  revalidatePath("/admin/availability");
}

export async function removeBlockedSlot(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("blocked_slots").delete().eq("id", id);
  revalidatePath("/admin/availability");
}

function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Closes every day in an inclusive date range (e.g. a week off) in one go,
// rather than making the admin add each day one at a time. Capped at 31 days
// so a typo in the end date can't silently block months of the calendar.
export async function addBlockedDateRange(formData: FormData) {
  const { supabase } = await requireAdmin();

  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const reason = ((formData.get("reason") as string) || "").trim() || null;
  if (!startDate || !endDate) return;

  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  if (end < start) return;

  const rows: { blocked_date: string; blocked_hour: null; reason: string | null }[] = [];
  const cursor = new Date(start);
  let days = 0;
  while (cursor <= end && days < 31) {
    rows.push({ blocked_date: toISODate(cursor), blocked_hour: null, reason });
    cursor.setDate(cursor.getDate() + 1);
    days++;
  }

  if (rows.length > 0) {
    await supabase.from("blocked_slots").insert(rows);
  }

  revalidatePath("/admin/availability");
}
