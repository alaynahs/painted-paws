import { SCHEDULE_FLAGS } from "@/components/schedule-flag-icons";

// Shown at the bottom of both /admin/grid and /admin/calendar — same icons
// mean the same thing in both places, so one shared legend for both.
export default function ScheduleLegend() {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-foreground">Key</h2>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2.5">
        {SCHEDULE_FLAGS.map(({ key, label, Icon, text, bg }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-foreground/90">
            <span className={`flex h-4 w-4 items-center justify-center rounded-full ${bg}`}>
              <Icon className={`h-2.5 w-2.5 ${text}`} />
            </span>
            {label}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">
        Icons stack — an appointment can show more than one at a time. Flags
        come from what&apos;s on file for the pet, so an empty field just
        won&apos;t show anything (not a guarantee it doesn&apos;t apply).
      </p>
    </div>
  );
}
