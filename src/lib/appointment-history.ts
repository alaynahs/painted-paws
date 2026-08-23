import type { createClient } from "@/lib/supabase/server";

export type AppointmentHistoryAction =
  | "booked"
  | "edited"
  | "cancelled"
  | "confirmed"
  | "completed";

// One shared insert used by every appointment lifecycle action (booking,
// editing, cancelling, confirming, completing) so the admin can see a full
// timeline of who did what and when, rather than just the appointment's
// current state. actorId/actorType come from whichever session actually
// performed the action, so an admin edit and a customer edit are always
// distinguishable.
export async function logAppointmentHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    appointmentId,
    action,
    actorType,
    actorId,
    note,
  }: {
    appointmentId: string;
    action: AppointmentHistoryAction;
    actorType: "admin" | "customer" | "system";
    actorId: string | null;
    note?: string;
  },
) {
  await supabase.from("appointment_history").insert({
    appointment_id: appointmentId,
    action,
    actor_type: actorType,
    actor_id: actorId,
    note: note ?? null,
  });
}
