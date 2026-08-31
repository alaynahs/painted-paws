"use client";

import { useEffect, useRef, useState } from "react";
import { markAppointmentComplete } from "@/app/admin/actions";
import { CheckoutIcon } from "@/components/stage-icons";

export default function MarkCompleteButton({
  appointmentId,
  compact = false,
  tile = false,
}: {
  appointmentId: string;
  compact?: boolean;
  tile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const triggerClass = tile
    ? "flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-accent-dark bg-accent-tint px-2 py-3 text-center transition-colors hover:bg-accent-dark hover:text-white"
    : compact
      ? "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
      : "rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark";

  return (
    <div ref={ref} className={tile ? "relative" : "relative inline-block"}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClass}>
        {tile ? (
          <>
            <CheckoutIcon className="h-5 w-5" />
            <span className="text-xs font-medium">Checkout</span>
          </>
        ) : compact ? (
          "Mark Complete ▾"
        ) : (
          "Mark Complete / Sent Home ▾"
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          <form action={markAppointmentComplete.bind(null, appointmentId, true, true)}>
            <button
              type="submit"
              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-accent-tint"
            >
              Review + tip, with photos
            </button>
          </form>
          <form action={markAppointmentComplete.bind(null, appointmentId, true, false)}>
            <button
              type="submit"
              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-accent-tint"
            >
              Review + tip, no photos
            </button>
          </form>
          <form action={markAppointmentComplete.bind(null, appointmentId, false, true)}>
            <button
              type="submit"
              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-accent-tint"
            >
              Review only, with photos
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
