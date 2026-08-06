"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PawIcon from "./paw-icon";
import { formatHour } from "@/lib/format";

const MAX_PAWS = 6;

export default function CalendarDayCell({
  iso,
  day,
  inMonth,
  isToday,
  appointments,
}: {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  appointments: { id: string; hour: number; minute: number; petName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = appointments.length;

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

  const shown = Math.min(count, MAX_PAWS);
  const overflow = count - MAX_PAWS;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => count > 0 && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => count > 0 && setOpen((v) => !v)}
        className={`flex min-h-16 w-full flex-col items-start gap-1 rounded-xl border p-1.5 text-left transition-colors sm:min-h-20 sm:p-2 ${
          inMonth
            ? "border-border bg-card hover:border-accent-dark"
            : "border-transparent bg-transparent opacity-40 hover:opacity-70"
        } ${isToday ? "ring-1 ring-accent-dark" : ""}`}
      >
        <span
          className={`text-xs sm:text-sm ${
            isToday
              ? "font-medium text-accent-dark"
              : inMonth
                ? "text-foreground/80"
                : "text-muted"
          }`}
        >
          {day}
        </span>
        {count > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {Array.from({ length: shown }).map((_, i) => (
              <PawIcon
                key={i}
                className="h-2.5 w-2.5 text-accent-dark sm:h-3 sm:w-3"
              />
            ))}
            {overflow > 0 && (
              <span className="text-[9px] font-medium text-accent-dark sm:text-[10px]">
                +{overflow}
              </span>
            )}
          </div>
        )}
      </button>

      {open && count > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-border bg-card p-3 shadow-lg">
          <ul className="space-y-1.5 text-xs text-foreground/90">
            {appointments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/appointments/${a.id}`}
                  className="hover:underline"
                >
                  <span className="font-medium text-accent-dark">
                    {formatHour(a.hour, a.minute)}
                  </span>{" "}
                  · {a.petName}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/admin?start=${iso}`}
            className="mt-2 inline-block text-xs font-medium text-accent-dark hover:underline"
          >
            View week →
          </Link>
        </div>
      )}
    </div>
  );
}
