import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import { confirmAppointment, setAppointmentOnlinePayment } from "@/app/book/actions";
import { estimateDurationMinutes } from "@/lib/schedule-duration";
import { monthsSince } from "@/lib/pricing/pricing";
import AdminScheduleGrid, {
  type GridAppointment,
} from "@/components/admin-schedule-grid";
import { SCHEDULE_FLAGS, type ScheduleFlagKey } from "@/components/schedule-flag-icons";

const SENIOR_AGE_YEARS = 7;

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
      "id, appointment_date, appointment_hour, appointment_minute, service, add_ons, price, status, payment_method, payment_status, pet_id, customer_id, pets(id, name, species, birth_date, health_concerns, rabies_vaccine_path), profiles:customer_id(full_name, phone)",
    )
    .neq("status", "cancelled")
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .order("appointment_hour", { ascending: true })
    .order("appointment_minute", { ascending: true });

  // "New customer" needs a lifetime count, not just this week's — one bulk
  // fetch of just the customer_id column is far cheaper than a separate
  // count query per appointment.
  const { data: allCustomerAppts } = await supabase
    .from("appointments")
    .select("customer_id");
  const apptCountByCustomer = new Map<string, number>();
  for (const a of allCustomerAppts ?? []) {
    apptCountByCustomer.set(
      a.customer_id,
      (apptCountByCustomer.get(a.customer_id) ?? 0) + 1,
    );
  }

  const appointmentsByDay: Record<string, GridAppointment[]> = {};
  for (const day of days) appointmentsByDay[day] = [];
  for (const appt of appointments ?? []) {
    if (!appointmentsByDay[appt.appointment_date]) continue;
    const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
    const profile = Array.isArray(appt.profiles) ? appt.profiles[0] : appt.profiles;
    const addOns: string[] = appt.add_ons ?? [];

    const flags: ScheduleFlagKey[] = [];
    if (appt.status === "requested") flags.push("requested");
    if (pet?.species === "cat") flags.push("cat");
    if ((apptCountByCustomer.get(appt.customer_id) ?? 0) <= 1) {
      flags.push("newCustomer");
    }
    if (pet?.birth_date && monthsSince(pet.birth_date) / 12 >= SENIOR_AGE_YEARS) {
      flags.push("senior");
    }
    if (pet?.health_concerns?.trim()) flags.push("healthConcerns");
    if (!pet?.rabies_vaccine_path) flags.push("vaccineNeeded");

    appointmentsByDay[appt.appointment_date].push({
      id: appt.id,
      hour: appt.appointment_hour,
      minute: appt.appointment_minute,
      durationMinutes: estimateDurationMinutes(appt.service, addOns),
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
          confirmAction={confirmAppointment}
          setOnlinePaymentAction={setAppointmentOnlinePayment}
        />
      </div>

      <p className="mt-4 text-xs text-muted">
        Block heights are estimated by service type, not an exact end time —
        tap a block for details and quick actions. Scroll sideways on a
        smaller screen to see the full week.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-foreground">Key</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2.5">
          <div className="flex items-center gap-1.5 text-xs text-foreground/90">
            <span className="rounded-full bg-accent-tint px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-accent-dark uppercase">
              Req
            </span>
            Requested, needs confirming
          </div>
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
          Icons stack — an appointment can show more than one at a time.
          Flags come from what&apos;s on file for the pet, so an empty
          field just won&apos;t show anything (not a guarantee it doesn&apos;t apply).
        </p>
      </div>
    </div>
  );
}
