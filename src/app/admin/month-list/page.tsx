import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import { confirmAppointment, setAppointmentOnlinePayment } from "@/app/book/actions";
import { estimateDurationMinutes } from "@/lib/schedule-duration";
import { buildScheduleContext, computeScheduleFlags } from "@/lib/schedule-flags";
import MonthListTiles from "@/components/month-list-tiles";
import type { ScheduleAppointment } from "@/components/appointment-detail-panel";
import ScheduleLegend from "@/components/schedule-legend";

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

// Every appointment for a whole month as small, color-flagged tiles (same
// flag-stripe colors as the grid views) instead of paging through a week
// at a time or clicking through the calendar grid — the "just show me all
// of it at once" option.
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
      "id, appointment_date, appointment_hour, appointment_minute, service, add_ons, price, status, payment_method, payment_status, pet_id, customer_id, duration_minutes, pets(id, name, species, birth_date, health_concerns, rabies_vaccine_path), profiles:customer_id(full_name, phone)",
    )
    .neq("status", "cancelled")
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .order("appointment_date", { ascending: true })
    .order("appointment_hour", { ascending: true })
    .order("appointment_minute", { ascending: true });

  const scheduleContext = await buildScheduleContext(supabase);

  const byDay: Record<string, ScheduleAppointment[]> = {};
  for (const appt of appointments ?? []) {
    const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
    const profile = Array.isArray(appt.profiles) ? appt.profiles[0] : appt.profiles;
    const addOns: string[] = appt.add_ons ?? [];
    const flags = computeScheduleFlags(appt, pet, scheduleContext);

    if (!byDay[appt.appointment_date]) byDay[appt.appointment_date] = [];
    byDay[appt.appointment_date].push({
      id: appt.id,
      date: appt.appointment_date,
      hour: appt.appointment_hour,
      minute: appt.appointment_minute,
      durationMinutes:
        appt.duration_minutes ?? estimateDurationMinutes(appt.service, addOns),
      petId: pet?.id ?? null,
      petName: pet?.name ?? "Unknown pet",
      ownerId: appt.customer_id,
      ownerName: profile?.full_name ?? "Unknown owner",
      ownerPhone: profile?.phone ?? null,
      service: appt.service,
      addOns,
      price: appt.price,
      status: appt.status,
      paymentMethod: appt.payment_method,
      paymentStatus: appt.payment_status,
      flags,
    });
  }
  const daysWithAppts = Object.keys(byDay).sort();

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
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
              <div className="mt-3">
                <MonthListTiles
                  appts={byDay[day]}
                  confirmAction={confirmAppointment}
                  setOnlinePaymentAction={setAppointmentOnlinePayment}
                />
              </div>
            </section>
          ))
        ) : (
          <p className="text-sm text-muted">
            No appointments scheduled for {MONTH_NAMES[month]}.
          </p>
        )}
      </div>

      <ScheduleLegend />
    </div>
  );
}
