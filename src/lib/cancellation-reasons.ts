// Shared between the cancel modal (client) and cancelAppointment (server) so
// the two can never drift out of sync on what a valid reason is.

export type CancellationReason =
  | "unable_to_make_it"
  | "facility_error"
  | "pet_health_behavior"
  | "vaccinations_not_current"
  | "no_call_no_show";

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  unable_to_make_it: "No longer able to make it",
  facility_error: "Facility error",
  pet_health_behavior: "Health/behavior of pet",
  vaccinations_not_current: "Vaccinations not up to date",
  no_call_no_show: "No call, no show",
};

// Every customer-facing reason, plus the admin-only no-show reason.
export const CUSTOMER_CANCELLATION_REASONS: CancellationReason[] = [
  "unable_to_make_it",
  "facility_error",
  "pet_health_behavior",
  "vaccinations_not_current",
];

export const ADMIN_CANCELLATION_REASONS: CancellationReason[] = [
  ...CUSTOMER_CANCELLATION_REASONS,
  "no_call_no_show",
];

export function isValidCancellationReason(
  value: string,
  isAdmin: boolean,
): value is CancellationReason {
  return (isAdmin ? ADMIN_CANCELLATION_REASONS : CUSTOMER_CANCELLATION_REASONS).includes(
    value as CancellationReason,
  );
}
