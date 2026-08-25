import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import { setAppointmentOnlinePayment } from "@/app/book/actions";
import { estimateDurationMinutes } from "@/lib/schedule-duration";
import AdminScheduleGrid from "@/components/admin-schedule-grid";
import type { ScheduleAppointment } from "@/components/appointment-detail-panel";
import ScheduleLegend from "@/components/schedule-legend";
import { buildScheduleContext, computeScheduleFlags } from "@/lib/schedule-flags";

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

function formatDayHeader(dateStr: string) {
  return parseISO(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDayLabel(dateStr: string) {
  return parseISO(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

export default async function AdminScheduleGridPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { start: startParam } = await searchParams;
  const start = startParam || todayISO();
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, appointment_hour, appointment_minute, service, add_ons, price, status, payment_method, payment_status, pet_id, customer_id, duration_minutes, pets(id, name, species, birth_date, health_concerns, rabies_vaccine_path, rabies_expires_at), profiles:customer_id(full_name, phone)",
    )
    .neq("status", "cancelled")
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .order("appointment_hour", { ascending: true })
    .order("appointment_minute", { ascending: true });

  const scheduleContext = await buildScheduleContext(supabase);

  const appointmentsByDay: Record<string, ScheduleAppointment[]> = {};
  for (const day of days) appointmentsByDay[day] = [];
  for (const appt of appointments ?? []) {
    if (!appointmentsByDay[appt.appointment_date]) continue;
    const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
    const profile = Array.isArray(appt.profiles) ? appt.profiles[0] : appt.profiles;
    const addOns: string[] = appt.add_ons ?? [];
    const flags = computeScheduleFlags(appt, pet, scheduleContext);

    appointmentsByDay[appt.appointment_date].push({
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

  const prevStart = addDays(start, -7);
  const nextStart = addDays(start, 7);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-foreground">Schedule Grid</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            List view
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
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Link
          href={`/admin/grid?start=${prevStart}`}
          className="shrink-0 rounded-full border border-border px-5 py-2.5 text-sm whitespace-nowrap font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          ← Previous week
        </Link>
        <p className="text-center text-sm text-muted">
          {formatDayHeader(start)} – {formatDayHeader(end)}
        </p>
        <Link
          href={`/admin/grid?start=${nextStart}`}
          className="shrink-0 rounded-full border border-border px-5 py-2.5 text-sm whitespace-nowrap font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Next week →
        </Link>
      </div>

      <div className="mt-8">
        <AdminScheduleGrid
          days={days}
          dayLabels={days.map(formatDayLabel)}
          appointmentsByDay={appointmentsByDay}
          setOnlinePaymentAction={setAppointmentOnlinePayment}
        />
      </div>

      <p className="mt-4 text-xs text-muted">
        Block heights are estimated by service type, not an exact end time —
        tap a block for details and quick actions. Scroll sideways on a
        smaller screen to see the full week.
      </p>

      <ScheduleLegend />
    </div>
  );
}
