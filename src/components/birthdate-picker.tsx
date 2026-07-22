"use client";

import { useEffect, useRef, useState } from "react";
import DatePickerCalendar from "./date-picker-calendar";

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDisplay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BirthdatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm text-foreground outline-none focus:border-accent-dark"
      >
        {value ? formatDisplay(value) : (
          <span className="text-muted">Select date of birth…</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2">
          <DatePickerCalendar
            value={value || todayISO()}
            maxDate={todayISO()}
            onChange={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
