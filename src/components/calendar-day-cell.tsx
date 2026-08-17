"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PawIcon from "./paw-icon";
import { formatHour } from "@/lib/format";
import AppointmentDetailPanel, {
  FlagBadge,
  type ScheduleAppointment,
} from "@/components/appointment-detail-panel";

const MAX_PAWS = 6;

export default function CalendarDayCell({
  iso,
  day,
  inMonth,
  isToday,
  appointments,
  confirmAction,
  setOnlinePaymentAction,
}: {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  appointments: ScheduleAppointment[];
  confirmAction: (appointmentId: string) => void;
  setOnlinePaymentAction: (appointmentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Which appointment (if any) inside this day's popover is showing full
  // detail + actions, same as tapping a block open on the week grid.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const count = appointments.length;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedId(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const shown = Math.min(count, MAX_PAWS);
  const overflow = count - MAX_PAWS;
  // Deduplicated across the day's appointments — a quick-glance signal
  // right on the cell, same colors/icons as the grid, before ever opening
  // the popover.
  const dayFlagKeys = Array.from(new Set(appointments.flatMap((a) => a.flags)));
  const expandedAppt = appointments.find((a) => a.id === expandedId) ?? null;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => count > 0 && setOpen(true)}
      onMouseLeave={() => {
        setOpen(false);
        setExpandedId(null);
      }}
    >
      <button
        type="button"
        onClick={() => count > 0 && setOpen((v) => !v)}
        // Same fix as the week grid: blocks the native focus-triggered
        // auto-scroll some browsers do on tap, which otherwise jolts the
        // page even though nothing here calls scrollIntoView itself.
        onMouseDown={(e) => e.preventDefault()}
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
        {dayFlagKeys.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {dayFlagKeys.map((key) => (
              <FlagBadge key={key} flagKey={key} sizeClass="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            ))}
          </div>
        )}
      </button>

      {open && count > 0 && (
        <div
          className="absolute left-0 top-full z-20 mt-1 w-[290px] rounded-xl border border-border bg-card p-3 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {expandedAppt ? (
            <AppointmentDetailPanel
              appt={expandedAppt}
              confirmAction={confirmAction}
              setOnlinePaymentAction={setOnlinePaymentAction}
              onClose={() => setExpandedId(null)}
            />
          ) : (
            <>
              <ul className="space-y-1">
                {appointments.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(a.id)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left text-xs text-foreground/90 transition-colors hover:bg-accent-tint"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-accent-dark">
                          {formatHour(a.hour, a.minute)}
                        </span>{" "}
                        · {a.petName}
                      </span>
                      {a.flags.length > 0 && (
                        <span className="flex shrink-0 gap-0.5">
                          {a.flags.map((key) => (
                            <FlagBadge key={key} flagKey={key} sizeClass="h-3 w-3" />
                          ))}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <Link
                href={`/admin/grid?start=${iso}`}
                className="mt-2 inline-block text-xs font-medium text-accent-dark hover:underline"
              >
                View week in grid →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
