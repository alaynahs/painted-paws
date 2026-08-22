import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import AppointmentListCard from "@/components/appointment-list-card";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function formatDayHeader(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Every appointment for a whole month in one flat, scrollable list — the
// week-at-a-time List view and the visual Month view grid both make you
// page through to see everything; this is the "just show me all of it"
// option, useful for a quick read of total volume or scanning for a
// specific booking without clicking through days/weeks.
export default async function AdminMonthListPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { month: monthParam } = await searchParams;

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const start = toISO(year, month, 1);
  const end = toISO(year, month, daysInMonth);

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "*, pets(id, name), profiles:customer_id(full_name, phone)",
    )
    .neq("status", "cancelled")
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .order("appointment_date", { ascending: true })
    .order("appointment_hour", { ascending: true })
    .order("appointment_minute", { ascending: true });

  const byDay: Record<string, NonNullable<typeof appointments>> = {};
  for (const appt of appointments ?? []) {
    if (!byDay[appt.appointment_date]) byDay[appt.appointment_date] = [];
    byDay[appt.appointment_date].push(appt);
  }
  const daysWithAppts = Object.keys(byDay).sort();

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-foreground">
          All Appointments
        </h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            List view
          </Link>
          <Link
            href="/admin/grid"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Week view
          </Link>
          <Link
            href="/admin/calendar"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Month view
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Link
          href={`/admin/month-list?month=${prevYear}-${pad(prevMonth + 1)}`}
          className="shrink-0 rounded-full border border-border px-5 py-2.5 text-sm whitespace-nowrap font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          ← Previous month
        </Link>
        <p className="text-center text-sm text-muted">
          {MONTH_NAMES[month]} {year}
        </p>
        <Link
          href={`/admin/month-list?month=${nextYear}-${pad(nextMonth + 1)}`}
          className="shrink-0 rounded-full border border-border px-5 py-2.5 text-sm whitespace-nowrap font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Next month →
        </Link>
      </div>

      <p className="mt-4 text-sm text-muted">
        {appointments?.length ?? 0} appointment
        {appointments?.length === 1 ? "" : "s"} in {MONTH_NAMES[month]}.
      </p>

      <div className="mt-6 space-y-6">
        {daysWithAppts.length > 0 ? (
          daysWithAppts.map((day) => (
            <section
              key={day}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <h2 className="font-serif text-lg text-foreground">
                {formatDayHeader(day)}
              </h2>
              <div className="mt-3 space-y-3">
                {byDay[day].map((appt) => (
                  <AppointmentListCard key={appt.id} appt={appt} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="text-sm text-muted">
            No appointments scheduled for {MONTH_NAMES[month]}.
          </p>
        )}
      </div>
    </div>
  );
}
