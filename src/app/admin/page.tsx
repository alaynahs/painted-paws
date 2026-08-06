import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import { confirmAppointment } from "@/app/book/actions";
import { markAppointmentComplete } from "@/app/admin/actions";
import CancelAppointmentButton from "@/components/cancel-appointment-button";
import QuickMessageButtons from "@/components/quick-message-buttons";
import { formatHour } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";

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

export default async function AdminDashboardPage({
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
            href="/admin/calendar"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Month view
          </Link>
          <Link
            href="/admin/availability"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Availability
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/pricing"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Pricing
        </Link>
        <Link
          href="/admin/photos"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Manage Photos
        </Link>
        <Link
          href="/admin/coupons"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Coupons
        </Link>
        <Link
          href="/admin/follow-ups"
          className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Follow-Up Log
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
                  <div
                    key={appt.id}
                    className="rounded-xl border border-border bg-background p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        {formatHour(appt.appointment_hour, appt.appointment_minute)}
                        {appt.status === "requested" && (
                          <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-dark">
                            Requested
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-medium text-accent-dark">
                        ${appt.price}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-foreground/90">
                      {appt.pets ? (
                        <Link
                          href={`/admin/pets/${appt.pets.id}`}
                          className="font-medium hover:text-accent-dark hover:underline"
                        >
                          {appt.pets.name}
                        </Link>
                      ) : (
                        "Unknown pet"
                      )}{" "}
                      ·{" "}
                      <Link
                        href={`/admin/customers/${appt.customer_id}`}
                        className="font-medium hover:text-accent-dark hover:underline"
                      >
                        {appt.profiles?.full_name ?? "Unknown owner"}
                      </Link>
                      {appt.profiles?.phone ? ` · ${appt.profiles.phone}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatServiceLabel(appt.service)}
                      {appt.add_ons?.length > 0 &&
                        ` · ${appt.add_ons.join(", ")}`}
                      {" · "}
                      {appt.payment_method === "online"
                        ? "Paid online"
                        : "Pay in person"}
                    </p>
                    {appt.pickup_dropoff && appt.pickup_address && (
                      <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
                        <span className="font-medium">
                          Pickup &amp; drop-off:
                        </span>{" "}
                        {appt.pickup_address}
                      </p>
                    )}
                    {appt.customer_note && (
                      <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
                        <span className="font-medium">
                          Pet parent note:
                        </span>{" "}
                        {appt.customer_note}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {appt.status === "requested" && (
                        <form action={confirmAppointment.bind(null, appt.id)}>
                          <button
                            type="submit"
                            className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                          >
                            Confirm
                          </button>
                        </form>
                      )}
                      {appt.status !== "completed" && (
                        <form action={markAppointmentComplete.bind(null, appt.id)}>
                          <button
                            type="submit"
                            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
                          >
                            Mark Complete
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/admin/appointments/${appt.id}`}
                        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
                      >
                        Edit
                      </Link>
                      <CancelAppointmentButton appointmentId={appt.id} />
                      <QuickMessageButtons appointmentId={appt.id} />
                    </div>
                  </div>
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
