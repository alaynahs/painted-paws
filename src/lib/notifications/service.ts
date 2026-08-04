import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, sendText } from "./send";
import type { EmailContent } from "./templates";

type AnyClient = SupabaseClient;

export type NotificationType =
  | "booking_confirmation"
  | "admin_new_booking"
  | "payment_link"
  | "admin_checkout_abandoned"
  | "admin_signup_no_booking"
  | "appointment_confirmed"
  | "first_time_welcome"
  | "new_client_vaccine_reminder"
  | "reminder_24h"
  | "post_visit_thank_you"
  | "review_request"
  | "vaccination_expiring"
  | "vaccination_expired"
  | "rebooking_8wk"
  | "rebooking_16wk"
  | "pickup_15min"
  | "pickup_ready"
  | "pickup_on_way"
  | "pickup_arrived"
  | "pickup_cant_reach"
  | "dropoff_on_way";

interface NotifyTarget {
  customerId: string;
  petId?: string | null;
  appointmentId?: string | null;
  email?: string | null;
  phone?: string | null;
}

async function logNotification(
  supabase: AnyClient,
  target: NotifyTarget,
  type: NotificationType,
  channel: "email" | "sms",
  status: "sent" | "failed" | "skipped",
) {
  await supabase.from("notifications_log").insert({
    customer_id: target.customerId,
    pet_id: target.petId ?? null,
    appointment_id: target.appointmentId ?? null,
    type,
    channel,
    status,
  });
}

export async function notifyText(
  supabase: AnyClient,
  target: NotifyTarget,
  type: NotificationType,
  body: string,
) {
  const status = await sendText(target.phone, body);
  await logNotification(supabase, target, type, "sms", status);
  return status;
}

export async function notifyEmail(
  supabase: AnyClient,
  target: NotifyTarget,
  type: NotificationType,
  content: EmailContent,
) {
  const status = await sendEmail(target.email, content.subject, content.body);
  await logNotification(supabase, target, type, "email", status);
  return status;
}

/** True if this appointment already received this type/channel — guards cron reminders against duplicate sends across runs. */
export async function alreadyNotifiedForAppointment(
  supabase: AnyClient,
  appointmentId: string,
  type: NotificationType,
) {
  const { data } = await supabase
    .from("notifications_log")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("type", type)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** True if this customer already received this type, ever — used for one-time admin nudges (e.g. signed up but never booked) that shouldn't repeat daily. */
export async function alreadyNotifiedForCustomer(
  supabase: AnyClient,
  customerId: string,
  type: NotificationType,
) {
  const { data } = await supabase
    .from("notifications_log")
    .select("id")
    .eq("customer_id", customerId)
    .eq("type", type)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** True if this pet already received this type since `since` — used for vaccine/rebooking reminders so they resend once per gap/cycle. */
export async function alreadyNotifiedForPetSince(
  supabase: AnyClient,
  petId: string,
  type: NotificationType,
  since: string,
) {
  const { data } = await supabase
    .from("notifications_log")
    .select("id")
    .eq("pet_id", petId)
    .eq("type", type)
    .gte("sent_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
