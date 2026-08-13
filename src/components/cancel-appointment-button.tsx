"use client";

import { useState } from "react";
import { cancelAppointment } from "@/app/book/actions";
import {
  ADMIN_CANCELLATION_REASONS,
  CANCELLATION_REASON_LABELS,
  CUSTOMER_CANCELLATION_REASONS,
  type CancellationReason,
} from "@/lib/cancellation-reasons";

export default function CancelAppointmentButton({
  appointmentId,
  isAdmin = false,
  variant = "button",
}: {
  appointmentId: string;
  isAdmin?: boolean;
  variant?: "button" | "link";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CancellationReason | "">("");
  const reasons = isAdmin ? ADMIN_CANCELLATION_REASONS : CUSTOMER_CANCELLATION_REASONS;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "link"
            ? "text-sm text-muted hover:text-foreground"
            : "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        }
      >
        Cancel{variant === "link" ? " this appointment" : ""}
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
              This can&apos;t be undone. You&apos;ll need to rebook if you
              change your mind.
            </p>

            <form action={cancelAppointment} className="mt-4">
              <input type="hidden" name="appointmentId" value={appointmentId} />
              <p className="text-xs font-medium text-foreground">
                Why are you cancelling?
              </p>
              <div className="mt-2 space-y-1.5">
                {reasons.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2 text-sm text-foreground/90"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="h-4 w-4 border-border accent-accent"
                    />
                    {CANCELLATION_REASON_LABELS[r]}
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark"
                >
                  No, keep it
                </button>
                <button
                  type="submit"
                  disabled={!reason}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Yes, cancel it
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
