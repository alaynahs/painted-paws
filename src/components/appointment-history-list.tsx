import { formatDateTime } from "@/lib/format";

export const APPOINTMENT_HISTORY_ACTION_LABELS: Record<string, string> = {
  booked: "Booked",
  edited: "Edited",
  cancelled: "Cancelled",
  confirmed: "Confirmed",
  completed: "Marked complete",
  checked_in: "Checked in",
  groom_started: "Haircut started",
  ready: "Marked ready",
};

export interface AppointmentHistoryRow {
  id: string;
  action: string;
  actor_type: string;
  note: string | null;
  created_at: string;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
}

// Shared between the standalone /admin/appointments/[id]/history page and
// the embedded card on the appointment dashboard, so the two never drift.
export default function AppointmentHistoryList({
  history,
}: {
  history: AppointmentHistoryRow[];
}) {
  if (history.length === 0) {
    return <p className="text-sm text-muted">No history recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {history.map((h) => {
        const profile = Array.isArray(h.profiles) ? h.profiles[0] : h.profiles;
        const who =
          h.actor_type === "admin"
            ? "You"
            : h.actor_type === "system"
              ? "System"
              : (profile?.full_name ?? "Pet parent");
        return (
          <div key={h.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm font-medium text-foreground">
                {APPOINTMENT_HISTORY_ACTION_LABELS[h.action] ?? h.action}
              </p>
              <p className="text-xs text-muted">{formatDateTime(h.created_at)}</p>
            </div>
            <p className="mt-1 text-xs text-muted">
              By {who}
              {h.note ? ` · ${h.note}` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
