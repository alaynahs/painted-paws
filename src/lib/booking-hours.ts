// Shared between the booking form (client) and the availability calculation
// (server) so the two can never drift out of sync.
export const BOOKING_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

// Extra whole-hour slots shown only when the admin is booking/editing an
// appointment on a customer's behalf — kept separate from BOOKING_HOURS so
// customer-facing availability (and the admin's own blocked-slots picker)
// stay unaffected. 17 = 5 PM, 18 = 6 PM.
export const ADMIN_EXTRA_HOURS = [17, 18];

// Expands a list of whole hours into on-the-hour and half-past slots, e.g.
// [8, 9] -> [8, 8.5, 9, 9.5]. Slot times are represented as decimal hours
// throughout (9.5 = 9:30) so gap math (see minGapHoursFor) stays simple.
export function expandToHalfHourSlots(hours: number[]): number[] {
  return hours.flatMap((h) => [h, h + 0.5]);
}

// Painted Paws' spacing rule: every appointment gets a minimum amount of
// breathing room around it so back-to-back grooms don't run into each
// other. Bigger dogs and pickup & drop-off trips both eat more of the day
// in practice, so they earn a wider berth. When checking two appointments
// against each other, use the larger of the two required gaps.
export function minGapHoursFor(
  weightLb: number | null | undefined,
  pickupDropoff: boolean,
): number {
  if (pickupDropoff) return 3;
  if (weightLb != null && weightLb > 20) return 2.5;
  return 2;
}

// The daily appointment cap now lives in pricing_config (see
// PricingConfig.maxAppointmentsPerDay) so it's admin-editable from
// /admin/pricing, instead of a hardcoded constant here.

// Pickup & drop-off requires enough notice to actually plan the trip, so it
// can't be booked for a slot starting less than this many hours from now.
export const PICKUP_MIN_LEAD_HOURS = 1;

// A cancellation counts as a no-show once the appointment time has already
// passed. Admin-initiated cancellations get a grace window (in case the
// groomer is just tidying up the schedule shortly after start time).
export const NO_SHOW_GRACE_MINUTES = 15;

// After this many no-shows, online booking is disabled for the customer —
// they have to email to book instead.
export const MAX_NO_SHOWS = 3;
