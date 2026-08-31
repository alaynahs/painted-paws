import type { ReactNode } from "react";
import ElapsedTimer from "@/components/elapsed-timer";
import { setAppointmentStage } from "@/app/admin/actions";

function stageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
}

function StageSlot({
  label,
  doneAt,
  action,
}: {
  label: string;
  doneAt: string | null;
  action: () => void;
}) {
  if (doneAt) {
    return (
      <div className="flex-1 rounded-xl border border-accent-dark/40 bg-accent-tint px-3 py-2 text-center">
        <p className="text-xs font-medium text-accent-dark">✓ {label}</p>
        <p className="text-[10px] text-muted">{stageTime(doneAt)}</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex-1">
      <button
        type="submit"
        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
      >
        {label}
      </button>
    </form>
  );
}

// Purely operational, same-day tracking — internal only, no customer
// notification (that's still a deliberate separate action via the quick
// messages). Checkout isn't a fourth stage column here; it's whatever the
// caller passes as checkoutSlot (the existing MarkCompleteButton), since
// it's terminal and already has its own email choice.
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
      <div className="mt-3 flex flex-wrap gap-2">
        <StageSlot
          label="Check In"
          doneAt={checkedInAt}
          action={setAppointmentStage.bind(null, appointmentId, "checked_in")}
        />
        <StageSlot
          label="Start Groom"
          doneAt={groomStartedAt}
          action={setAppointmentStage.bind(null, appointmentId, "groom_started")}
        />
        <StageSlot
          label="Mark Ready"
          doneAt={readyAt}
          action={setAppointmentStage.bind(null, appointmentId, "ready")}
        />
      </div>
      <div className="mt-2">{checkoutSlot}</div>
    </section>
  );
}
