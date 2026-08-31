import Link from "next/link";
import CancelAppointmentButton from "@/components/cancel-appointment-button";
import MarkCompleteButton from "@/components/mark-complete-button";
import { formatDate, formatHour } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";

export interface PetAppointmentRow {
  id: string;
  appointment_date: string;
  appointment_hour: number;
  appointment_minute: number;
  status: string;
  service: string;
  add_ons: string[];
  price: number;
  customer_note: string | null;
  haircut_description?: string | null;
  inspo_photo_path?: string | null;
}

export default function PetAppointmentCard({
  appt,
  inspoUrl,
  showActions = false,
}: {
  appt: PetAppointmentRow;
  inspoUrl?: string;
  showActions?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {formatDate(appt.appointment_date)}
        </p>
        <span className="shrink-0 rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-dark">
          {appt.status}
        </span>
      </div>
      <p className="text-xs text-muted">
        {formatHour(appt.appointment_hour, appt.appointment_minute)}
      </p>
      <p className="mt-1 text-xs text-foreground/90">
        {formatServiceLabel(appt.service)}
        {appt.add_ons?.length > 0 && ` · ${appt.add_ons.join(", ")}`}
      </p>
      <p className="mt-1 text-xs font-medium text-accent-dark">
        ${appt.price}
      </p>
      {appt.customer_note && (
        <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
          <span className="font-medium">Pet parent:</span> {appt.customer_note}
        </p>
      )}
      {appt.haircut_description && (
        <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
          <span className="font-medium">Haircut request:</span>{" "}
          {appt.haircut_description}
        </p>
      )}
      {inspoUrl && (
        <a
          href={inspoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-accent-dark hover:underline"
        >
          View inspiration photo/PDF →
        </a>
      )}
      {showActions && (
        <div className="mt-3 flex flex-wrap gap-2">
          {appt.status !== "completed" && (
            <MarkCompleteButton appointmentId={appt.id} compact />
          )}
          <Link
            href={`/admin/appointments/${appt.id}`}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Edit
          </Link>
          <CancelAppointmentButton appointmentId={appt.id} isAdmin />
        </div>
      )}
    </div>
  );
}
