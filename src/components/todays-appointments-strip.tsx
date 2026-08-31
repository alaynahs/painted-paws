import Link from "next/link";
import { formatHour } from "@/lib/format";

export interface StripAppointment {
  id: string;
  hour: number;
  minute: number;
  petName: string;
  status: string;
}

// A horizontal strip of the other appointments on this same date — lets
// the admin jump between today's visits without leaving to the full
// week/month grid. Scoped to the viewed appointment's own date, not
// necessarily today's calendar date, so it's just as useful when prepping
// for a future day.
export default function TodaysAppointmentsStrip({
  appointments,
  currentAppointmentId,
}: {
  appointments: StripAppointment[];
  currentAppointmentId: string;
}) {
  if (appointments.length <= 1) return null;

  return (
    <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 sm:mx-0 sm:px-0">
      {appointments.map((appt) => {
        const isCurrent = appt.id === currentAppointmentId;
        return (
          <Link
            key={appt.id}
            href={`/admin/appointments/${appt.id}`}
            className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs transition-colors ${
              isCurrent
                ? "border-accent bg-accent text-white"
                : "border-border bg-card text-foreground/80 hover:border-accent-dark"
            }`}
          >
            <p className="font-medium">{appt.petName}</p>
            <p className={isCurrent ? "text-white/80" : "text-muted"}>
              {formatHour(appt.hour, appt.minute)}
              {appt.status === "completed" ? " · done" : ""}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
