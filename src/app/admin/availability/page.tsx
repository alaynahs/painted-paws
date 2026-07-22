import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import {
  addBlockedSlot,
  addBlockedDateRange,
  removeBlockedSlot,
} from "@/app/admin/actions";
import { BOOKING_HOURS } from "@/lib/booking-hours";
import { formatDate, formatHour } from "@/lib/format";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminAvailabilityPage() {
  const { supabase } = await requireAdmin();

  const { data: blocks } = await supabase
    .from("blocked_slots")
    .select("*")
    .gte("blocked_date", todayISO())
    .order("blocked_date", { ascending: true })
    .order("blocked_hour", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-foreground">Availability</h1>
        <Link
          href="/admin"
          className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Back to Schedule
        </Link>
      </div>
      <p className="mt-3 text-sm text-muted">
        Close off a whole day or a specific hour so customers can&apos;t book
        it. Appointments already booked are unaffected — this only blocks new
        bookings.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">Close a date</h2>
        <form action={addBlockedSlot} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="date"
              >
                Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                min={todayISO()}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
              />
            </div>
            <div>
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="hour"
              >
                Hour
              </label>
              <select
                id="hour"
                name="hour"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
              >
                {BOOKING_HOURS.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              name="wholeDay"
              value="true"
              className="h-4 w-4 rounded border-border accent-accent"
            />
            Close the entire day (ignores the hour above)
          </label>

          <div>
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="reason"
            >
              Reason{" "}
              <span className="font-normal text-muted">
                (optional, just for your reference)
              </span>
            </label>
            <input
              id="reason"
              name="reason"
              type="text"
              placeholder="e.g. Vacation, personal appointment…"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
            />
          </div>

          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Close it off
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          Close a week (or any range of days)
        </h2>
        <p className="mt-1 text-xs text-muted">
          Closes every day in the range, all day — handy for vacations or
          time off.
        </p>
        <form action={addBlockedDateRange} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="startDate"
              >
                Start date
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                min={todayISO()}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
              />
            </div>
            <div>
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="endDate"
              >
                End date
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                required
                min={todayISO()}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
              />
            </div>
          </div>

          <div>
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="rangeReason"
            >
              Reason{" "}
              <span className="font-normal text-muted">
                (optional, just for your reference)
              </span>
            </label>
            <input
              id="rangeReason"
              name="reason"
              type="text"
              placeholder="e.g. Vacation…"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
            />
          </div>

          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Close this range
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          Upcoming closures
        </h2>
        {blocks && blocks.length > 0 ? (
          <div className="mt-4 space-y-2">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(b.blocked_date)}
                    {b.blocked_hour === null
                      ? " — All day"
                      : ` — ${formatHour(b.blocked_hour)}`}
                  </p>
                  {b.reason && (
                    <p className="mt-0.5 text-xs text-muted">{b.reason}</p>
                  )}
                </div>
                <form action={removeBlockedSlot.bind(null, b.id)}>
                  <button
                    type="submit"
                    className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No upcoming closures.</p>
        )}
      </section>
    </div>
  );
}
