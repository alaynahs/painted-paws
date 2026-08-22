"use client";

import { useState } from "react";
import { formatHour } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";
import { SCHEDULE_FLAGS } from "@/components/schedule-flag-icons";
import AppointmentDetailPanel, {
  FlagBadge,
  type ScheduleAppointment,
} from "@/components/appointment-detail-panel";

// Same color-stripe-by-flag treatment as the grid's Block component, just
// laid out as small tiles that wrap in normal document flow instead of
// being absolutely time-positioned in a day column — lets every
// appointment in the month show at once instead of one day's worth at a
// time.
function Tile({
  appt,
  confirmAction,
  setOnlinePaymentAction,
}: {
  appt: ScheduleAppointment;
  confirmAction: (appointmentId: string) => void;
  setOnlinePaymentAction: (appointmentId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow ${
        open ? "w-full shadow-md" : "w-[168px]"
      }`}
    >
      <div className="flex">
        <div className="flex w-1.5 shrink-0 flex-col">
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
          className="min-w-0 flex-1 cursor-pointer px-2.5 py-2 text-left"
        >
          <div className="flex min-w-0 items-center gap-1">
            <p className="min-w-0 truncate text-[12px] font-medium text-foreground">
              {appt.petName}
            </p>
            {appt.status === "requested" && (
              <span className="shrink-0 rounded-full bg-accent-tint px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-accent-dark uppercase">
                Req
              </span>
            )}
          </div>
          {appt.flags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap items-center gap-0.5">
              {appt.flags.map((flagKey) => (
                <FlagBadge key={flagKey} flagKey={flagKey} sizeClass="h-3 w-3" />
              ))}
            </div>
          )}
          <p className="truncate text-[10px] text-muted">
            {formatHour(appt.hour, appt.minute)} · {formatServiceLabel(appt.service)}
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
            confirmAction={confirmAction}
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
  confirmAction,
  setOnlinePaymentAction,
}: {
  appts: ScheduleAppointment[];
  confirmAction: (appointmentId: string) => void;
  setOnlinePaymentAction: (appointmentId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {appts.map((appt) => (
        <Tile
          key={appt.id}
          appt={appt}
          confirmAction={confirmAction}
          setOnlinePaymentAction={setOnlinePaymentAction}
        />
      ))}
    </div>
  );
}
