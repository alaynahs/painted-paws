"use client";

import { useState } from "react";
import { formatDate, formatHour } from "@/lib/format";

export interface UnpaidAppointmentSummary {
  id: string;
  petName: string;
  date: string;
  hour: number;
  minute: number;
  price: number;
}

// Shown on every /account visit while an online-payment appointment is
// still unpaid — not just right after saving a card — per the owner's
// explicit call that this should nag every time, not only once.
export default function UnpaidAppointmentsPopup({
  appointments,
  payAction,
}: {
  appointments: UnpaidAppointmentSummary[];
  payAction: () => void;
}) {
  const [open, setOpen] = useState(appointments.length > 0);
  if (appointments.length === 0) return null;

  const total = appointments.reduce((sum, a) => sum + a.price, 0);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-foreground">
              Pay for your upcoming services?
            </p>
            <p className="mt-2 text-sm text-muted">
              You have {appointments.length} unpaid upcoming appointment
              {appointments.length === 1 ? "" : "s"} set to pay online.
            </p>

            <div className="mt-4 space-y-2">
              {appointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="text-foreground/90">
                    {a.petName} · {formatDate(a.date)} at{" "}
                    {formatHour(a.hour, a.minute)}
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    ${a.price}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3 text-sm font-medium">
              <span className="text-foreground">Total</span>
              <span className="text-accent-dark">${total}</span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark"
              >
                Not now
              </button>
              <form action={payAction}>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Yes, pay ${total}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
