"use client";

import { useState } from "react";
import { cancelAppointment } from "@/app/book/actions";

export default function CancelAppointmentButton({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
      >
        Cancel
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
              Cancel this appointment?
            </p>
            <p className="mt-2 text-sm text-muted">
              This can&apos;t be undone — you&apos;ll need to rebook if you
              change your mind.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark"
              >
                No, keep it
              </button>
              <form action={cancelAppointment.bind(null, appointmentId)}>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Yes, cancel it
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
