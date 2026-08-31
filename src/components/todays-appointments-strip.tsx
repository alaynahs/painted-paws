import Link from "next/link";
import PawIcon from "@/components/paw-icon";
import { formatHour } from "@/lib/format";

export interface StripAppointment {
  id: string;
  hour: number;
  minute: number;
  petName: string;
  photoUrl: string | null;
  stageLabel: string;
  isCurrent: boolean;
}

// A horizontal strip of the other appointments on this same date — lets
// the admin jump between today's visits without leaving to the full
// week/month grid. Scoped to the viewed appointment's own date, not
// necessarily today's calendar date, so it's just as useful when prepping
// for a future day.
export default function TodaysAppointmentsStrip({
  appointments,
}: {
  appointments: StripAppointment[];
}) {
  if (appointments.length <= 1) return null;

  return (
    <div className="-mx-6 flex gap-2.5 overflow-x-auto px-6 pb-2 sm:mx-0 sm:px-0">
      {appointments.map((appt) => (
        <Link
          key={appt.id}
          href={`/admin/appointments/${appt.id}`}
          className={`flex w-32 shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-center transition-colors ${
            appt.isCurrent
              ? "border-accent bg-accent-tint"
              : "border-border bg-card hover:border-accent-dark"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-accent-tint">
            {appt.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage, not an optimizable static asset
              <img
                src={appt.photoUrl}
                alt={appt.petName}
                className="h-full w-full object-cover"
              />
            ) : (
              <PawIcon className="h-5 w-5 text-accent-dark opacity-50" />
            )}
          </div>
          <p className="w-full truncate text-xs font-medium text-foreground">
            {appt.petName}
          </p>
          <p className="text-[10px] text-muted">
            {formatHour(appt.hour, appt.minute)}
          </p>
          <p
            className={`text-[10px] font-medium ${
              appt.isCurrent ? "text-accent-dark" : "text-muted"
            }`}
          >
            {appt.stageLabel}
          </p>
        </Link>
      ))}
    </div>
  );
}
