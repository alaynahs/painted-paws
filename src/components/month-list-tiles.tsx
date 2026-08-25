"use client";

import { useState } from "react";
import { formatHour } from "@/lib/format";
import { SCHEDULE_FLAGS } from "@/components/schedule-flag-icons";
import AppointmentDetailPanel, {
  FlagBadge,
  type ScheduleAppointment,
} from "@/components/appointment-detail-panel";

function shortDate(dateStr: string) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
}

// Same color-stripe-by-flag treatment as the grid's Block component, just
// laid out as small tiles that wrap in normal document flow instead of
// being absolutely time-positioned in a day column, with the date printed
// on the tile itself instead of a per-day section header — that's what
// lets a whole month's worth flow as one dense, unbroken grid instead of
// paying a header+card tax on every single day.
function Tile({
  appt,
  setOnlinePaymentAction,
}: {
  appt: ScheduleAppointment;
  setOnlinePaymentAction: (appointmentId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`overflow-hidden rounded-md border border-border bg-card shadow-sm transition-shadow ${
        open ? "w-full shadow-md" : "w-[122px]"
      }`}
    >
      <div className="flex">
        <div className="flex w-1 shrink-0 flex-col">
          {appt.flags.length > 0 ? (
            appt.flags.map((flagKey) => {
              const flag = SCHEDULE_FLAGS.find((f) => f.key === flagKey);
              if (!flag) return null;
              return <div key={flagKey} className={`flex-1 ${flag.stripe}`} />;
            })
          ) : (
            <div className="flex-1 bg-border" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 cursor-pointer px-1.5 py-1 text-left"
        >
          <p className="min-w-0 truncate text-[11px] font-medium text-foreground">
            {appt.petName}
          </p>
          {appt.flags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap items-center gap-0.5">
              {appt.flags.map((flagKey) => (
                <FlagBadge key={flagKey} flagKey={flagKey} sizeClass="h-2.5 w-2.5" />
              ))}
            </div>
          )}
          <p className="truncate text-[9px] text-muted">
            {shortDate(appt.date)} · {formatHour(appt.hour, appt.minute)}
          </p>
        </button>
      </div>
      {open && (
        <div
          className="border-t border-border bg-background px-3 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <AppointmentDetailPanel
            appt={appt}
            setOnlinePaymentAction={setOnlinePaymentAction}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function MonthListTiles({
  appts,
  setOnlinePaymentAction,
}: {
  appts: ScheduleAppointment[];
  setOnlinePaymentAction: (appointmentId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {appts.map((appt) => (
        <Tile
          key={appt.id}
          appt={appt}
          setOnlinePaymentAction={setOnlinePaymentAction}
        />
      ))}
    </div>
  );
}
