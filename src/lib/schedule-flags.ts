// Shared between the week grid (/admin/grid) and the month view
// (/admin/calendar) so both ever compute "does this appointment deserve a
// flag" the same way — a discrepancy between the two would be worse than
// either one being wrong consistently.
import { monthsSince } from "@/lib/pricing/pricing";
import { todayInCentral } from "@/lib/format";
import type { ScheduleFlagKey } from "@/components/schedule-flag-icons";
import type { createClient } from "@/lib/supabase/server";

const SENIOR_AGE_YEARS = 7;

export interface ScheduleContext {
  earliestDateByCustomer: Map<string, string>;
  cautionPetIds: Set<string>;
}

// Two bulk queries instead of one per appointment: "new customer" needs
// every appointment's date for that customer (not just this view's date
// range), and "caution" needs every pet with a caution-rated note.
export async function buildScheduleContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ScheduleContext> {
  const [{ data: allCustomerAppts }, { data: cautionNotes }] = await Promise.all([
    supabase.from("appointments").select("customer_id, appointment_date"),
    supabase.from("groom_notes").select("pet_id").eq("rating", "caution"),
  ]);

  const earliestDateByCustomer = new Map<string, string>();
  for (const a of allCustomerAppts ?? []) {
    const current = earliestDateByCustomer.get(a.customer_id);
    if (!current || a.appointment_date < current) {
      earliestDateByCustomer.set(a.customer_id, a.appointment_date);
    }
  }
  const cautionPetIds = new Set<string>(
    (cautionNotes ?? []).map((n: { pet_id: string }) => n.pet_id),
  );

  return { earliestDateByCustomer, cautionPetIds };
}

export function computeScheduleFlags(
  appt: {
    status: string;
    customer_id: string;
    appointment_date: string;
    pet_id: string | null;
  },
  pet: {
    species?: string | null;
    birth_date?: string | null;
    health_concerns?: string | null;
    rabies_vaccine_path?: string | null;
    rabies_expires_at?: string | null;
  } | null,
  ctx: ScheduleContext,
): ScheduleFlagKey[] {
  const flags: ScheduleFlagKey[] = [];
  if (appt.pet_id && ctx.cautionPetIds.has(appt.pet_id)) flags.push("caution");
  if (pet?.species === "cat") flags.push("cat");
  if (ctx.earliestDateByCustomer.get(appt.customer_id) === appt.appointment_date) {
    flags.push("newCustomer");
  }
  if (pet?.birth_date && monthsSince(pet.birth_date) / 12 >= SENIOR_AGE_YEARS) {
    flags.push("senior");
  }
  if (pet?.health_concerns?.trim()) flags.push("healthConcerns");
  // A file attachment isn't actually required to record a rabies vaccine —
  // the admin can log just an expiration date over the phone with no PDF
  // on hand (see uploadRabiesVaccineAdmin) — so file presence alone isn't
  // enough to clear this flag, and an expiration date in the past should
  // still raise it even if a (now-stale) file is on record.
  const expired = !!pet?.rabies_expires_at && pet.rabies_expires_at < todayInCentral();
  const hasRecord = !!pet?.rabies_vaccine_path || !!pet?.rabies_expires_at;
  if (!hasRecord || expired) flags.push("vaccineNeeded");
  return flags;
}
