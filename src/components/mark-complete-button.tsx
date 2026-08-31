"use client";

import { useEffect, useRef, useState } from "react";
import { markAppointmentComplete } from "@/app/admin/actions";

export default function MarkCompleteButton({
  appointmentId,
  compact = false,
}: {
  appointmentId: string;
  compact?: boolean;
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

  const triggerClass = compact
    ? "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
    : "rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark";

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClass}>
        {compact ? "Mark Complete ▾" : "Mark Complete / Sent Home ▾"}
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
