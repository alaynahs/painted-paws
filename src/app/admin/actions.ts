"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/supabase/admin";
import { notifyText, type NotificationType } from "@/lib/notifications/service";
import {
  cantReachClientSms,
  mobileDropoffOnWaySms,
  mobilePickupArrivedSms,
  mobilePickupOnWaySms,
  pickup15MinSms,
  pickupReadySms,
} from "@/lib/notifications/templates";

export async function addGroomNote(formData: FormData) {
  const { supabase } = await requireAdmin();

  const petId = formData.get("petId") as string;
  const noteType = formData.get("noteType") as string;
  const note = formData.get("note") as string;

  if (!note.trim()) return;

  await supabase.from("groom_notes").insert({
    pet_id: petId,
    note_type: noteType,
    note,
  });

  revalidatePath(`/admin/pets/${petId}`);
}

type QuickMessageType =
  | "pickup_15min"
  | "pickup_ready"
  | "pickup_on_way"
  | "pickup_arrived"
  | "pickup_cant_reach"
  | "dropoff_on_way";

interface AppointmentContact {
  id: string;
  customer_id: string;
  pets: { id: string; name: string } | { id: string; name: string }[] | null;
  profiles:
    | { full_name: string | null; phone: string | null }
    | { full_name: string | null; phone: string | null }[]
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
      "id, customer_id, pets(id, name), profiles:customer_id(full_name, phone)",
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
    phone: profile?.phone ?? null,
  };
  const vars = {
    firstName: (profile?.full_name || "there").split(" ")[0],
    petName: pet.name,
  };

  let body: string;
  switch (type) {
    case "pickup_15min": {
      const origin = (await headers()).get("origin");
      body = pickup15MinSms({
        ...vars,
        reviewUrl: `${origin}/leave-a-review/${appt.id}`,
      });
      break;
    }
    case "pickup_ready":
      body = pickupReadySms(vars);
      break;
    case "pickup_on_way":
      body = mobilePickupOnWaySms({ ...vars, eta: extra || "15 minutes" });
      break;
    case "pickup_arrived":
      body = mobilePickupArrivedSms(vars);
      break;
    case "pickup_cant_reach":
      body = cantReachClientSms({ ...vars, waitMinutes: extra || "10" });
      break;
    case "dropoff_on_way":
      body = mobileDropoffOnWaySms({ ...vars, eta: extra || "15 minutes" });
      break;
    default:
      return;
  }

  await notifyText(supabase, target, type as NotificationType, body);
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
