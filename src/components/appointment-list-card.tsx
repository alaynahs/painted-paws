import Link from "next/link";
import { setAppointmentOnlinePayment } from "@/app/book/actions";
import CancelAppointmentButton from "@/components/cancel-appointment-button";
import QuickMessageButtons from "@/components/quick-message-buttons";
import MarkCompleteButton from "@/components/mark-complete-button";
import { formatHour } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";

export interface AppointmentListItem {
  id: string;
  appointment_hour: number;
  appointment_minute: number;
  status: string;
  price: number;
  service: string;
  add_ons: string[] | null;
  payment_method: "online" | "in_person";
  payment_status: string;
  pickup_dropoff: boolean | null;
  pickup_address: string | null;
  customer_note: string | null;
  customer_id: string;
  pets: { id: string; name: string } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
}

// Appointment card used by the week-at-a-time List view (/admin).
export default function AppointmentListCard({ appt }: { appt: AppointmentListItem }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          {formatHour(appt.appointment_hour, appt.appointment_minute)}
        </p>
        <p className="text-sm font-medium text-accent-dark">${appt.price}</p>
      </div>
      <p className="mt-1 text-sm text-foreground/90">
        {appt.pets ? (
          <Link
            href={`/admin/pets/${appt.pets.id}`}
            className="font-medium hover:text-accent-dark hover:underline"
          >
            {appt.pets.name}
          </Link>
        ) : (
          "Unknown pet"
        )}{" "}
        ·{" "}
        <Link
          href={`/admin/customers/${appt.customer_id}`}
          className="font-medium hover:text-accent-dark hover:underline"
        >
          {appt.profiles?.full_name ?? "Unknown owner"}
        </Link>
        {appt.profiles?.phone ? ` · ${appt.profiles.phone}` : ""}
      </p>
      <p className="mt-1 text-xs text-muted">
        {formatServiceLabel(appt.service)}
        {(appt.add_ons?.length ?? 0) > 0 && ` · ${appt.add_ons!.join(", ")}`}
        {" · "}
        {appt.payment_method === "online"
          ? appt.payment_status === "paid"
            ? "Paid online"
            : appt.payment_status === "refunded"
              ? "Refunded"
              : appt.payment_status === "deposit_paid"
                ? "Partially paid"
                : "Pay online (unpaid)"
          : "Pay in person"}
      </p>
      {appt.pickup_dropoff && appt.pickup_address && (
        <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
          <span className="font-medium">Pickup &amp; drop-off:</span>{" "}
          {appt.pickup_address}
        </p>
      )}
      {appt.customer_note && (
        <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
          <span className="font-medium">Pet parent note:</span>{" "}
          {appt.customer_note}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {appt.status !== "completed" && (
          <MarkCompleteButton appointmentId={appt.id} compact />
        )}
        {appt.payment_method === "in_person" && appt.payment_status === "unpaid" && (
          <form action={setAppointmentOnlinePayment.bind(null, appt.id)}>
            <button
              type="submit"
              className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
            >
              Pay Online
            </button>
          </form>
        )}
        <Link
          href={`/admin/appointments/${appt.id}`}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Edit
        </Link>
        <CancelAppointmentButton appointmentId={appt.id} isAdmin />
        <QuickMessageButtons appointmentId={appt.id} />
      </div>
    </div>
  );
}
