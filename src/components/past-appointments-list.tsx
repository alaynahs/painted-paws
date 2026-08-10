import { formatDate, formatHour } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";
import ShowMoreList from "@/components/show-more-list";

interface PastAppointment {
  id: string;
  price: number;
  service: string;
  add_ons: string[] | null;
  payment_method: string;
  payment_status: string;
  status: string;
  appointment_date: string;
  appointment_hour: number;
  appointment_minute: number;
  pets?: { name: string } | null;
}

export default function PastAppointmentsList({
  appointments,
  payAppointmentNowAction,
}: {
  appointments: PastAppointment[];
  payAppointmentNowAction: (appointmentId: string) => Promise<void>;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-serif text-lg text-foreground">
        Past Appointments
      </h2>

      {appointments.length > 0 ? (
        <div className="mt-4 space-y-3">
          <ShowMoreList initialCount={3}>
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-serif text-base text-foreground">
                    {appt.pets?.name} · {formatDate(appt.appointment_date)} at{" "}
                    {formatHour(appt.appointment_hour, appt.appointment_minute)}
                  </p>
                  <p className="text-sm font-medium text-accent-dark">
                    ${appt.price}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatServiceLabel(appt.service)}
                  {appt.add_ons && appt.add_ons.length > 0 &&
                    ` · ${appt.add_ons.join(", ")}`}
                  {" · "}
                  {appt.payment_method === "online"
                    ? appt.payment_status === "paid"
                      ? "Paid online"
                      : appt.payment_status === "refunded"
                        ? "Refunded"
                        : "Pay online (unpaid)"
                    : "Pay in person"}
                  {" · "}
                  {appt.status}
                </p>
                {appt.payment_method === "online" &&
                  appt.payment_status !== "paid" &&
                  appt.payment_status !== "refunded" &&
                  appt.status !== "cancelled" && (
                    <div className="mt-3">
                      <form action={payAppointmentNowAction.bind(null, appt.id)}>
                        <button
                          type="submit"
                          className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                        >
                          Pay Now (${appt.price})
                        </button>
                      </form>
                    </div>
                  )}
              </div>
            ))}
          </ShowMoreList>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">No past appointments yet.</p>
      )}
    </section>
  );
}
