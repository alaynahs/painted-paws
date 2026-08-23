"use client";

import Link from "next/link";
import { formatHour } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";
import CancelAppointmentButton from "@/components/cancel-appointment-button";
import QuickMessageButtons from "@/components/quick-message-buttons";
import MarkCompleteButton from "@/components/mark-complete-button";
import { SCHEDULE_FLAGS, type ScheduleFlagKey } from "@/components/schedule-flag-icons";

// Shared shape for anything that can render as an appointment on either the
// week grid (/admin/grid) or the month view (/admin/calendar) — same data,
// same detail panel, same actions, so the two views stay visually and
// functionally in sync instead of drifting into two half-features.
export interface ScheduleAppointment {
  id: string;
  date: string;
  hour: number;
  minute: number;
  durationMinutes: number;
  petId: string | null;
  petName: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string | null;
  service: string;
  addOns: string[];
  price: number;
  status: string;
  paymentMethod: "online" | "in_person";
  paymentStatus: string;
  flags: ScheduleFlagKey[];
}

export function FlagBadge({
  flagKey,
  sizeClass,
}: {
  flagKey: ScheduleFlagKey;
  sizeClass: string;
}) {
  const flag = SCHEDULE_FLAGS.find((f) => f.key === flagKey);
  if (!flag) return null;
  return (
    <span
      title={flag.label}
      className={`flex shrink-0 items-center justify-center rounded-full ${flag.bg} ${sizeClass}`}
    >
      <flag.Icon className={flag.text} style={{ width: "62%", height: "62%" }} />
    </span>
  );
}

// The full expanded view of one appointment — name/owner, flags with
// labels, service, payment status/price, and every quick action (Confirm,
// Mark Complete, Pay Online, Edit, Cancel, Quick email). Used identically
// by the grid's own expand-in-place block and the month view's per-day
// popover.
export default function AppointmentDetailPanel({
  appt,
  confirmAction,
  setOnlinePaymentAction,
  onClose,
}: {
  appt: ScheduleAppointment;
  confirmAction: (appointmentId: string) => void;
  setOnlinePaymentAction: (appointmentId: string) => void;
  onClose?: () => void;
}) {
  const paymentLabel =
    appt.paymentMethod === "online"
      ? appt.paymentStatus === "paid"
        ? "Paid online"
        : appt.paymentStatus === "refunded"
          ? "Refunded"
          : appt.paymentStatus === "deposit_paid"
            ? "Partially paid"
            : "Pay online (unpaid)"
      : "Pay in person";

  // Uploading before/after shots only makes sense once the groom has
  // actually started — this button stays hidden until 1 minute past the
  // booked time, rather than showing up hours early with nothing to upload
  // yet.
  const [apptYear, apptMonth, apptDay] = appt.date.split("-").map(Number);
  const apptStart = new Date(apptYear, apptMonth - 1, apptDay, appt.hour, appt.minute);
  const hasStarted = new Date() >= apptStart;

  return (
    <div className="text-sm">
      <p className="font-serif text-base text-foreground">
        {appt.petId ? (
          <Link
            href={`/admin/pets/${appt.petId}`}
            className="hover:text-accent-dark hover:underline"
          >
            {appt.petName}
          </Link>
        ) : (
          appt.petName
        )}{" "}
        ·{" "}
        <Link
          href={`/admin/customers/${appt.ownerId}`}
          className="hover:text-accent-dark hover:underline"
        >
          {appt.ownerName}
        </Link>
      </p>
      <p className="mt-0.5 text-muted">
        {formatHour(appt.hour, appt.minute)}
        {appt.ownerPhone ? ` · ${appt.ownerPhone}` : ""}
      </p>
      {appt.flags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {appt.flags.map((flagKey) => {
            const flag = SCHEDULE_FLAGS.find((f) => f.key === flagKey);
            if (!flag) return null;
            return (
              <span
                key={flagKey}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${flag.bg} ${flag.text}`}
              >
                <flag.Icon className="h-3 w-3 shrink-0" />
                {flag.label}
              </span>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-foreground/90">
        {formatServiceLabel(appt.service)}
        {appt.addOns.length > 0 && ` · ${appt.addOns.join(", ")}`}
      </p>
      <p className="mt-1 flex items-center justify-between gap-2">
        <span className="text-muted">{paymentLabel}</span>
        <span className="font-medium text-accent-dark">${appt.price}</span>
      </p>

      <div
        className={
          "mt-3 grid grid-cols-1 gap-1.5 " +
          // These action buttons come from several separate components
          // (some with their own dropdown/modal markup nested inside), so a
          // blanket "every button" selector would also stretch things like
          // the Cancel confirmation modal's own side-by-side buttons.
          // Direct-child selectors reach only each item's own top-level
          // trigger, one or two levels down depending on whether that
          // component wraps its trigger in a div.
          "[&>form]:w-full [&>form>button]:w-full " +
          "[&>a]:block [&>a]:w-full [&>a]:text-center " +
          "[&>button]:w-full " +
          "[&>div]:w-full [&>div>button]:w-full"
        }
      >
        {appt.status === "requested" && (
          <form action={confirmAction.bind(null, appt.id)}>
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
            >
              Confirm
            </button>
          </form>
        )}
        {appt.paymentMethod === "in_person" && appt.paymentStatus === "unpaid" && (
          <form action={setOnlinePaymentAction.bind(null, appt.id)}>
            <button
              type="submit"
              className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
            >
              Pay Online
            </button>
          </form>
        )}
        {appt.status !== "completed" && (
          <MarkCompleteButton appointmentId={appt.id} compact />
        )}
        <QuickMessageButtons appointmentId={appt.id} />
        {hasStarted && (
          <Link
            href={`/admin/appointments/${appt.id}/photos`}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Before &amp; After Photos
          </Link>
        )}
        <CancelAppointmentButton appointmentId={appt.id} isAdmin />
        <Link
          href={`/admin/appointments/${appt.id}`}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Edit
        </Link>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-center text-xs text-muted hover:text-foreground"
        >
          Close
        </button>
      )}
    </div>
  );
}
