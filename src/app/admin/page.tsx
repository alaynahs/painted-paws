import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import AppointmentListCard from "@/components/appointment-list-card";

function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number) {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function todayISO() {
  return toISO(new Date());
}

// Always show a full calendar week, Monday through Sunday, rather than a
// rolling 7 days from whatever day it happens to be.
function mondayOf(dateStr: string) {
  const d = parseISO(dateStr);
  const daysSinceMonday = (d.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0, ...
  return addDays(dateStr, -daysSinceMonday);
}

function formatDayHeader(dateStr: string) {
  return parseISO(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { start: startParam } = await searchParams;
  const start = mondayOf(startParam || todayISO());
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "*, pets(id, name, species), profiles:customer_id(full_name, phone)",
    )
    .neq("status", "cancelled")
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .order("appointment_hour", { ascending: true })
    .order("appointment_minute", { ascending: true });

  const byDay: Record<string, NonNullable<typeof appointments>> = {};
  for (const day of days) byDay[day] = [];
  for (const appt of appointments ?? []) {
    if (byDay[appt.appointment_date]) {
      byDay[appt.appointment_date].push(appt);
    }
  }

  const prevStart = addDays(start, -7);
  const nextStart = addDays(start, 7);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-foreground">Schedule</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/grid"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Grid view
          </Link>
          <Link
            href="/admin/calendar"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Month view
          </Link>
          <Link
            href="/admin/month-list"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            View all
          </Link>
          <Link
            href="/admin/availability"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Availability
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Link
          href="/admin/pricing"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Pricing
        </Link>
        <Link
          href="/admin/quick-quote"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Quick Quote
        </Link>
        <Link
          href="/admin/photos"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Manage Photos
        </Link>
        <Link
          href="/admin/coupons"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Coupons
        </Link>
        <Link
          href="/admin/follow-ups"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Follow-Up Log
        </Link>
        <Link
          href="/admin/revenue"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Revenue
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Link
          href={`/admin?start=${prevStart}`}
          className="shrink-0 rounded-full border border-border px-5 py-2.5 text-sm whitespace-nowrap font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          ← Previous week
        </Link>
        <p className="text-center text-sm text-muted">
          {formatDayHeader(start)} – {formatDayHeader(end)}
        </p>
        <Link
          href={`/admin?start=${nextStart}`}
          className="shrink-0 rounded-full border border-border px-5 py-2.5 text-sm whitespace-nowrap font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Next week →
        </Link>
      </div>

      <div className="mt-8 space-y-6">
        {days.map((day) => (
          <section
            key={day}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <h2 className="font-serif text-lg text-foreground">
              {formatDayHeader(day)}
            </h2>
            {byDay[day].length > 0 ? (
              <div className="mt-3 space-y-3">
                {byDay[day].map((appt) => (
                  <AppointmentListCard key={appt.id} appt={appt} />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                No appointments scheduled.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
