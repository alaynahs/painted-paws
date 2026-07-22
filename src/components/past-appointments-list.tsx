"use client";

import { useState } from "react";
import { formatDate, formatHour } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";

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
  pets?: { name: string } | null;
}

const VISIBLE_COUNT = 3;

export default function PastAppointmentsList({
  appointments,
  payAppointmentNowAction,
}: {
  appointments: PastAppointment[];
  payAppointmentNowAction: (appointmentId: string) => Promise<void>;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? appointments : appointments.slice(0, VISIBLE_COUNT);
  const remaining = appointments.length - VISIBLE_COUNT;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-lg text-foreground">
          Past Appointments
        </h2>
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            {showAll ? "Show less" : `Show more (${remaining})`}
          </button>
        )}
      </div>

      {appointments.length > 0 ? (
        <div className="mt-4 space-y-3">
          {visible.map((appt) => (
            <div
              key={appt.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-serif text-base text-foreground">
                  {appt.pets?.name} — {formatDate(appt.appointment_date)} at{" "}
                  {formatHour(appt.appointment_hour)}
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
                    : "Pay online (unpaid)"
                  : "Pay in person"}
                {" · "}
                {appt.status}
              </p>
              {appt.payment_method === "online" &&
                appt.payment_status !== "paid" &&
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
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">No past appointments yet.</p>
      )}
    </section>
  );
}
