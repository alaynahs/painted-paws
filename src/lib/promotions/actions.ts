"use server";

import { createServiceClient } from "@/lib/supabase/service";

export interface ActivePromotion {
  id: string;
  name: string;
  discountPercent: number;
  // null = unlimited (no cap configured for this promotion).
  remaining: number | null;
  maxAppointmentLeadDays: number | null;
  // Custom banner copy, if the admin set one — falls back to generated
  // wording ("Limited-Time Offer: X% Off Any Groom") when null.
  bannerMessage: string | null;
}

// Finds the best currently-running, not-yet-maxed-out promotion (if any).
// "Currently running" ignores the appointment lead-time rule, since that
// depends on a specific date the caller may not have chosen yet — see
// promotionAppliesToDate() for checking a specific date against the result.
// Usage is counted via a service-role client since it spans every
// customer's appointments, not just the caller's own RLS-scoped view.
export async function getActivePromotion(): Promise<ActivePromotion | null> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: promos } = await supabase
    .from("promotions")
    .select(
      "id, name, discount_percent, max_uses, max_appointment_lead_days, banner_message",
    )
    .eq("active", true)
    .lte("starts_at", nowIso)
    // A null ends_at means "runs until manually stopped" — never filtered
    // out by the end-date check.
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("discount_percent", { ascending: false });

  if (!promos || promos.length === 0) return null;

  const cappedIds = promos.filter((p) => p.max_uses != null).map((p) => p.id);
  const usageById = new Map<string, number>();
  if (cappedIds.length > 0) {
    const { data: rows } = await supabase
      .from("appointments")
      .select("promo_id")
      .in("promo_id", cappedIds);
    for (const row of rows ?? []) {
      if (!row.promo_id) continue;
      usageById.set(row.promo_id, (usageById.get(row.promo_id) ?? 0) + 1);
    }
  }

  for (const promo of promos) {
    const remaining =
      promo.max_uses == null
        ? null
        : promo.max_uses - (usageById.get(promo.id) ?? 0);
    if (remaining != null && remaining <= 0) continue;
    return {
      id: promo.id,
      name: promo.name,
      discountPercent: promo.discount_percent,
      remaining,
      maxAppointmentLeadDays: promo.max_appointment_lead_days,
      bannerMessage: promo.banner_message,
    };
  }
  return null;
}
