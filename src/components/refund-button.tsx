"use client";

import { useState } from "react";
import { refundAppointmentPayment } from "@/app/book/actions";

export default function RefundButton({
  appointmentId,
  price,
}: {
  appointmentId: string;
  price: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-blue-600 px-6 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
      >
        Refund (${price})
      </button>

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
              Refund ${price} to the pet parent?
            </p>
            <p className="mt-2 text-sm text-muted">
              This sends the money back to their card through Stripe right
              away. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark"
              >
                No, keep the payment
              </button>
              <form action={refundAppointmentPayment.bind(null, appointmentId)}>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Yes, refund it
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
