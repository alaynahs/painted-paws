import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import {
  centralDateOnly,
  centralWallClockToInstant,
  formatDate,
  formatHour,
  todayInCentral,
} from "@/lib/format";
import FollowUpWeekPicker from "@/components/follow-up-week-picker";

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

interface NotificationRow {
  id: string;
  sent_at: string;
  customer_id: string;
  profiles: { full_name: string | null; phone: string | null } | null;
  pets: { name: string } | null;
}

interface CancellationRow {
  id: string;
  appointment_date: string;
  appointment_hour: number;
  cancelled_at: string | null;
  no_show: boolean;
  customer_id: string;
  profiles: { full_name: string | null; phone: string | null } | null;
  pets: { name: string } | null;
}

function one<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

// Beyond this many, the rest are only available as a PDF download rather
// than cluttering the page.
const VISIBLE_LIMIT = 5;

export default async function AdminFollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { start: startParam } = await searchParams;

  // Defaults to the last 7 days (including today). Picking any day in the
  // calendar below jumps to the 7-day window starting that day, per the
  // admin's request — not a Sun-Mon calendar week, just "that day + the
  // next 6."
  const weekStart = startParam || addDays(todayInCentral(), -6);
  const weekEnd = addDays(weekStart, 6);
  const rangeStartInstant = centralWallClockToInstant(weekStart, 0).toISOString();
  const rangeEndInstant = centralWallClockToInstant(
    addDays(weekEnd, 1),
    0,
  ).toISOString();
  const prevWeekStart = addDays(weekStart, -7);
  const nextWeekStart = addDays(weekStart, 7);

  const [{ data: lapse8 }, { data: lapse16 }, { data: cancellations }] =
    await Promise.all([
      supabase
        .from("notifications_log")
        .select(
          "id, sent_at, customer_id, profiles:customer_id(full_name, phone), pets:pet_id(name)",
        )
        .eq("type", "rebooking_8wk")
        .order("sent_at", { ascending: false })
        .limit(100),
      supabase
        .from("notifications_log")
        .select(
          "id, sent_at, customer_id, profiles:customer_id(full_name, phone), pets:pet_id(name)",
        )
        .eq("type", "rebooking_16wk")
        .order("sent_at", { ascending: false })
        .limit(100),
      supabase
        .from("appointments")
        .select(
          "id, appointment_date, appointment_hour, cancelled_at, no_show, customer_id, profiles:customer_id(full_name, phone), pets(name)",
        )
        .eq("status", "cancelled")
        .gte("cancelled_at", rangeStartInstant)
        .lt("cancelled_at", rangeEndInstant)
        .order("cancelled_at", { ascending: false })
        .limit(100),
    ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Follow-Up Log
      </h1>
      <p className="mt-3 text-sm text-muted">
        Customers worth a personal call — lapsed at 8 or 16 weeks, or who
        cancelled a booking.
      </p>

      <LogSection
        title="8-Week Lapse"
        rows={(lapse8 ?? []) as unknown as NotificationRow[]}
        emptyText="No one has hit the 8-week lapse mark yet."
        renderDate={(r) => formatDate(centralDateOnly(r.sent_at))}
        pdfHref="/api/admin/follow-ups/pdf?type=rebooking_8wk"
      />

      <LogSection
        title="16-Week Lapse"
        rows={(lapse16 ?? []) as unknown as NotificationRow[]}
        emptyText="No one has hit the 16-week lapse mark yet."
        renderDate={(r) => formatDate(centralDateOnly(r.sent_at))}
        pdfHref="/api/admin/follow-ups/pdf?type=rebooking_16wk"
      />

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-serif text-lg text-foreground">Cancellations</h2>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/follow-ups?start=${prevWeekStart}`}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
            >
              ← Previous week
            </Link>
            <p className="text-xs text-muted whitespace-nowrap">
              {formatDate(weekStart)} – {formatDate(weekEnd)}
            </p>
            <Link
              href={`/admin/follow-ups?start=${nextWeekStart}`}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
            >
              Next week →
            </Link>
          </div>
        </div>
        <FollowUpWeekPicker start={weekStart} />
        {(() => {
          const allCancellations = (cancellations ?? []) as unknown as CancellationRow[];
          const visible = allCancellations.slice(0, VISIBLE_LIMIT);
          const remaining = allCancellations.length - visible.length;
          return visible.length > 0 ? (
            <>
              <div className="mt-4 space-y-3">
                {visible.map((row) => {
                  const profile = one(row.profiles);
                  const pet = one(row.pets);
                  return (
                    <Link
                      key={row.id}
                      href={`/admin/customers/${row.customer_id}`}
                      className="block rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent-dark"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="font-serif text-base text-foreground">
                          {profile?.full_name ?? "Unknown"}
                          {pet?.name ? ` · ${pet.name}` : ""}
                        </p>
                        {row.no_show && (
                          <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-dark">
                            No-show
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {profile?.phone ?? "No phone on file"} · Was booked for{" "}
                        {formatDate(row.appointment_date)} at{" "}
                        {formatHour(row.appointment_hour)}
                        {row.cancelled_at &&
                          ` · Cancelled ${formatDate(centralDateOnly(row.cancelled_at))}`}
                      </p>
                    </Link>
                  );
                })}
              </div>
              {remaining > 0 && (
                <a
                  href={`/api/admin/follow-ups/pdf?type=cancellations&start=${weekStart}`}
                  className="mt-3 inline-block rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
                >
                  📄 Download full list ({allCancellations.length} total) as PDF
                </a>
              )}
            </>
          ) : null;
        })()}
        {(!cancellations || cancellations.length === 0) && (
          <p className="mt-4 text-sm text-muted">
            No cancellations in this week.
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">Dogs by Breed</h2>
        <p className="mt-1 text-sm text-muted">
          One searchable PDF listing every dog on file, grouped under its
          breed — e.g. Poodle: Tom Petty, Goldendoodle: Millie.
        </p>
        <a
          href="/api/admin/follow-ups/pdf?type=all_breeds"
          className="mt-3 inline-block rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          📄 Download Full Breed List (PDF)
        </a>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground/90">
            Or download just one breed
          </p>
          <form
            method="get"
            action="/api/admin/follow-ups/pdf"
            className="mt-2 flex flex-wrap gap-2"
          >
            <input type="hidden" name="type" value="breed_search" />
            <input
              type="text"
              name="breed"
              required
              placeholder="e.g. Poodle, Goldendoodle…"
              className="min-w-[160px] flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
            >
              Download PDF
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function LogSection({
  title,
  rows,
  emptyText,
  renderDate,
  pdfHref,
}: {
  title: string;
  rows: NotificationRow[];
  emptyText: string;
  renderDate: (row: NotificationRow) => string;
  pdfHref: string;
}) {
  const visible = rows.slice(0, VISIBLE_LIMIT);
  const remaining = rows.length - visible.length;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-serif text-lg text-foreground">{title}</h2>
      {visible.length > 0 ? (
        <div className="mt-4 space-y-3">
          {visible.map((row) => {
            const profile = one(row.profiles);
            const pet = one(row.pets);
            return (
              <Link
                key={row.id}
                href={`/admin/customers/${row.customer_id}`}
                className="block rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent-dark"
              >
                <p className="font-serif text-base text-foreground">
                  {profile?.full_name ?? "Unknown"}
                  {pet?.name ? ` · ${pet.name}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {profile?.phone ?? "No phone on file"} · Sent{" "}
                  {renderDate(row)}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">{emptyText}</p>
      )}
      {remaining > 0 && (
        <a
          href={pdfHref}
          className="mt-3 inline-block rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          📄 Download full list ({rows.length} total) as PDF
        </a>
      )}
    </section>
  );
}
