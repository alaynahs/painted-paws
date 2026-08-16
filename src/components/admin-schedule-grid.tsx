"use client";

import { useState } from "react";
import Link from "next/link";
import { formatHour } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";
import CancelAppointmentButton from "@/components/cancel-appointment-button";
import QuickMessageButtons from "@/components/quick-message-buttons";
import MarkCompleteButton from "@/components/mark-complete-button";
import { SCHEDULE_FLAGS, type ScheduleFlagKey } from "@/components/schedule-flag-icons";

export interface GridAppointment {
  id: string;
  hour: number;
  minute: number;
  durationMinutes: number;
  petId: string | null;
  petName: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string | null;
  service: string;
  addOns: string[];
  price: number;
  status: string;
  paymentMethod: "online" | "in_person";
  paymentStatus: string;
  flags: ScheduleFlagKey[];
}

function FlagBadge({ flagKey, sizeClass }: { flagKey: ScheduleFlagKey; sizeClass: string }) {
  const flag = SCHEDULE_FLAGS.find((f) => f.key === flagKey);
  if (!flag) return null;
  return (
    <span
      title={flag.label}
      className={`flex shrink-0 items-center justify-center rounded-full ${flag.bg} ${sizeClass}`}
    >
      <flag.Icon className={flag.text} style={{ width: "62%", height: "62%" }} />
    </span>
  );
}

// Zoomed out so more of the week is visible without scrolling — the
// tradeoff is handled by letting an opened appointment grow as tall as it
// needs (height: "auto" below) rather than by giving every block more
// width up front.
const PX_PER_HOUR = 44;
const DAY_COL_MIN_WIDTH = 72;
const TIME_COL_WIDTH = 44;

function hourLabel(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

// The admin can (and does) double-book the same slot on purpose — e.g. two
// dogs from the same household at once — so appointments in a day can't
// just assume they get the full column width. This assigns each one a
// "lane" among only the others it actually overlaps in time, same idea as
// how Google Calendar lays out concurrent events side by side.
function layoutLanes(
  appts: GridAppointment[],
): (GridAppointment & { lane: number; laneCount: number })[] {
  const withRange = appts
    .map((a) => ({
      appt: a,
      start: a.hour * 60 + a.minute,
      end: a.hour * 60 + a.minute + a.durationMinutes,
    }))
    .sort((a, b) => a.start - b.start);

  const result: (GridAppointment & { lane: number; laneCount: number })[] = [];
  let cluster: typeof withRange = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const assigned: { item: (typeof withRange)[number]; lane: number }[] = [];
    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[lane] = item.end;
      }
      assigned.push({ item, lane });
    }
    const laneCount = laneEnds.length;
    for (const { item, lane } of assigned) {
      result.push({ ...item.appt, lane, laneCount });
    }
    cluster = [];
  }

  for (const item of withRange) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      flushCluster();
      clusterEnd = -Infinity;
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flushCluster();

  return result;
}

function Block({
  appt,
  startHour,
  confirmAction,
  setOnlinePaymentAction,
}: {
  appt: GridAppointment & { lane: number; laneCount: number };
  startHour: number;
  confirmAction: (appointmentId: string) => void;
  setOnlinePaymentAction: (appointmentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const top = (appt.hour + appt.minute / 60 - startHour) * PX_PER_HOUR;
  const height = Math.max(24, (appt.durationMinutes / 60) * PX_PER_HOUR - 2);
  const laneWidthPct = 100 / appt.laneCount;

  const paymentLabel =
    appt.paymentMethod === "online"
      ? appt.paymentStatus === "paid"
        ? "Paid online"
        : appt.paymentStatus === "refunded"
          ? "Refunded"
          : "Pay online (unpaid)"
      : "Pay in person";

  return (
    <div
      className={`absolute z-10 overflow-hidden rounded-lg bg-card pl-1.5 text-left shadow-sm transition-shadow ${
        open ? "z-20 shadow-lg" : "hover:shadow-md"
      }`}
      style={
        open
          ? { top, height: "auto", minHeight: height, left: 2, right: 2 }
          : {
              top,
              height,
              left: `calc(${appt.lane * laneWidthPct}% + 2px)`,
              width: `calc(${laneWidthPct}% - 4px)`,
            }
      }
    >
      <div className="absolute inset-y-0 left-0 flex w-1.5 flex-col">
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

      {!open && (
        // Covers the whole block, including the area over the color
        // stripe (which sits underneath in DOM order), so tapping
        // anywhere on the block opens it — not just the text itself.
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className="absolute inset-0 cursor-pointer py-1 pr-2 pl-2.5 text-left"
        >
          <div className="flex min-w-0 items-center gap-1">
            <p className="min-w-0 truncate text-[11px] font-medium text-foreground">
              {appt.petName}
            </p>
            {appt.status === "requested" && (
              <span className="shrink-0 rounded-full bg-accent-tint px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-accent-dark uppercase">
                Req
              </span>
            )}
          </div>
          {appt.flags.length > 0 && (
            <div className="mt-0.5 flex items-center justify-between">
              {appt.flags.map((flagKey) => (
                <FlagBadge key={flagKey} flagKey={flagKey} sizeClass="h-3.5 w-3.5" />
              ))}
            </div>
          )}
          <p className="truncate text-[10px] text-muted">
            {formatHour(appt.hour, appt.minute)} · {formatServiceLabel(appt.service)}
          </p>
          {height > 50 && (
            <p className="truncate text-[10px] text-muted">{appt.ownerName}</p>
          )}
        </div>
      )}

      {open && (
        <div className="border-t border-border bg-background px-2.5 py-2.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-serif text-sm text-foreground">
              {appt.petId ? (
                <Link
                  href={`/admin/pets/${appt.petId}`}
                  className="hover:text-accent-dark hover:underline"
                >
                  {appt.petName}
                </Link>
              ) : (
                appt.petName
              )}{" "}
              ·{" "}
              <Link
                href={`/admin/customers/${appt.ownerId}`}
                className="hover:text-accent-dark hover:underline"
              >
                {appt.ownerName}
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="shrink-0 rounded-full px-1.5 text-sm text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
          {appt.ownerPhone && <p className="mt-0.5 text-muted">{appt.ownerPhone}</p>}
          {appt.flags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {appt.flags.map((flagKey) => {
                const flag = SCHEDULE_FLAGS.find((f) => f.key === flagKey);
                if (!flag) return null;
                return (
                  <span
                    key={flagKey}
                    className={`flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ${flag.bg} ${flag.text}`}
                  >
                    <flag.Icon className="h-2.5 w-2.5 shrink-0" />
                    {flag.label}
                  </span>
                );
              })}
            </div>
          )}
          <p className="mt-1.5 text-foreground/90">
            {formatServiceLabel(appt.service)}
            {appt.addOns.length > 0 && ` · ${appt.addOns.join(", ")}`}
          </p>
          <p className="mt-1 flex items-center justify-between gap-2">
            <span className="text-muted">{paymentLabel}</span>
            <span className="font-medium text-accent-dark">${appt.price}</span>
          </p>

          <div
            className={
              "mt-2 grid grid-cols-1 gap-1.5 " +
              // These action buttons come from several separate components
              // (some with their own dropdown/modal markup nested inside),
              // so a blanket "every button" selector would also stretch
              // things like the Cancel confirmation modal's own side-by-side
              // buttons. Direct-child selectors reach only each item's own
              // top-level trigger, one or two levels down depending on
              // whether that component wraps its trigger in a div.
              "[&>form]:w-full [&>form>button]:w-full " +
              "[&>a]:block [&>a]:w-full [&>a]:text-center " +
              "[&>button]:w-full " +
              "[&>div]:w-full [&>div>button]:w-full"
            }
          >
            {appt.status === "requested" && (
              <form action={confirmAction.bind(null, appt.id)}>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Confirm
                </button>
              </form>
            )}
            {appt.paymentMethod === "in_person" &&
              appt.paymentStatus === "unpaid" && (
                <form action={setOnlinePaymentAction.bind(null, appt.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
                  >
                    Pay Online
                  </button>
                </form>
              )}
            {appt.status !== "completed" && (
              <MarkCompleteButton appointmentId={appt.id} compact />
            )}
            <QuickMessageButtons appointmentId={appt.id} />
            <CancelAppointmentButton appointmentId={appt.id} isAdmin />
            <Link
              href={`/admin/appointments/${appt.id}`}
              className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
            >
              Edit
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminScheduleGrid({
  days,
  dayLabels,
  appointmentsByDay,
  confirmAction,
  setOnlinePaymentAction,
}: {
  days: string[];
  dayLabels: string[];
  appointmentsByDay: Record<string, GridAppointment[]>;
  confirmAction: (appointmentId: string) => void;
  setOnlinePaymentAction: (appointmentId: string) => void;
}) {
  const allAppts = days.flatMap((d) => appointmentsByDay[d] ?? []);
  const earliest = allAppts.length
    ? Math.min(...allAppts.map((a) => a.hour))
    : 8;
  const latest = allAppts.length
    ? Math.max(
        ...allAppts.map((a) => a.hour + Math.ceil(a.durationMinutes / 60)),
      )
    : 18;

  const startHour = Math.min(8, earliest);
  const endHour = Math.max(18, latest, startHour + 1);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = hours.length * PX_PER_HOUR;
  const totalWidth = TIME_COL_WIDTH + days.length * DAY_COL_MIN_WIDTH;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div className="flex" style={{ minWidth: totalWidth }}>
        <div
          className="shrink-0 border-r border-border"
          style={{ width: TIME_COL_WIDTH }}
        >
          <div className="h-9 border-b border-border" />
          <div style={{ height: gridHeight }} className="relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted"
                style={{ top: (h - startHour) * PX_PER_HOUR }}
              >
                {hourLabel(h)}
              </div>
            ))}
          </div>
        </div>

        {days.map((day, i) => (
          <div
            key={day}
            className="flex-1 border-r border-border last:border-r-0"
            style={{ minWidth: DAY_COL_MIN_WIDTH }}
          >
            <div className="flex h-9 flex-col items-center justify-center border-b border-border px-1 text-center">
              <p className="text-[11px] font-medium text-foreground">{dayLabels[i]}</p>
            </div>
            <div className="relative" style={{ height: gridHeight }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute right-0 left-0 border-t border-border/70"
                  style={{ top: (h - startHour) * PX_PER_HOUR }}
                />
              ))}
              {layoutLanes(appointmentsByDay[day] ?? []).map((appt) => (
                <Block
                  key={appt.id}
                  appt={appt}
                  startHour={startHour}
                  confirmAction={confirmAction}
                  setOnlinePaymentAction={setOnlinePaymentAction}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
