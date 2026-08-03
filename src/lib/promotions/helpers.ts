// Plain, synchronous helpers shared by both server actions and client
// components — no "use server", no DB access.

export function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// A promotion with no lead-time rule always applies; otherwise the chosen
// appointment date must be within maxAppointmentLeadDays days from today.
export function promotionAppliesToDate(
  maxAppointmentLeadDays: number | null,
  dateStr: string,
): boolean {
  if (maxAppointmentLeadDays == null) return true;
  return daysUntil(dateStr) <= maxAppointmentLeadDays;
}
