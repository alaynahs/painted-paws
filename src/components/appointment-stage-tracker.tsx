import type { ReactNode } from "react";
import ElapsedTimer from "@/components/elapsed-timer";
import { setAppointmentStage } from "@/app/admin/actions";
import { CheckInIcon, ScissorsIcon, ReadyIcon } from "@/components/stage-icons";

function stageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
}

function StageTile({
  label,
  icon,
  doneAt,
  action,
}: {
  label: string;
  icon: ReactNode;
  doneAt: string | null;
  action: () => void;
}) {
  if (doneAt) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-accent-dark bg-accent-tint px-2 py-3 text-center">
        <div className="relative">
          {icon}
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-dark text-[8px] text-white">
            ✓
          </span>
        </div>
        <span className="text-xs font-medium text-accent-dark">{label}</span>
        <span className="text-[10px] text-muted">{stageTime(doneAt)}</span>
      </div>
    );
  }
  return (
    <form action={action}>
      <button
        type="submit"
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-3 text-center text-foreground/80 transition-colors hover:border-accent-dark hover:text-accent-dark"
      >
        {icon}
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px] text-muted">—</span>
      </button>
    </form>
  );
}

// Purely operational, same-day tracking — internal only, no customer
// notification (that's still a deliberate separate action via the quick
// messages). Checkout is the 4th tile visually, but functionally it's
// whatever the caller passes as checkoutSlot (MarkCompleteButton in tile
// mode), since it's terminal and already has its own email choice.
export default function AppointmentStageTracker({
  appointmentId,
  checkedInAt,
  groomStartedAt,
  readyAt,
  checkoutSlot,
}: {
  appointmentId: string;
  checkedInAt: string | null;
  groomStartedAt: string | null;
  readyAt: string | null;
  checkoutSlot: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
          Today&apos;s Visit
        </h2>
        {checkedInAt && !readyAt && (
          <span className="text-xs text-muted">
            <ElapsedTimer since={checkedInAt} /> in-salon
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <StageTile
          label="Check In"
          icon={<CheckInIcon className="h-5 w-5" />}
          doneAt={checkedInAt}
          action={setAppointmentStage.bind(null, appointmentId, "checked_in")}
        />
        <StageTile
          label="Start Haircut"
          icon={<ScissorsIcon className="h-5 w-5" />}
          doneAt={groomStartedAt}
          action={setAppointmentStage.bind(null, appointmentId, "groom_started")}
        />
        <StageTile
          label="Mark Ready"
          icon={<ReadyIcon className="h-5 w-5" />}
          doneAt={readyAt}
          action={setAppointmentStage.bind(null, appointmentId, "ready")}
        />
        {checkoutSlot}
      </div>
    </section>
  );
}
