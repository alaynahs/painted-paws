import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import { centralWallClockToInstant, todayInCentral } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";

function monthBounds(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${monthStr}-01`,
    end: `${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

function shiftMonth(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { month: monthParam } = await searchParams;
  const month = monthParam || todayInCentral().slice(0, 7);
  const { start, end } = monthBounds(month);
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  const periodStartInstant = centralWallClockToInstant(start, 0).toISOString();
  const periodEndInstant = centralWallClockToInstant(`${nextMonth}-01`, 0).toISOString();

  const [
    { data: paidAppts },
    { data: refundedAppts },
    { data: paidPacks },
    { data: periodTips },
    { data: activeMemberships },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, price, service, payment_method, appointment_date")
      .eq("payment_status", "paid")
      .gte("appointment_date", start)
      .lte("appointment_date", end),
    supabase
      .from("appointments")
      .select("id, price")
      .eq("payment_status", "refunded")
      .gte("appointment_date", start)
      .lte("appointment_date", end),
    supabase
      .from("groom_credit_packs")
      .select("id, total_price")
      .eq("payment_status", "paid")
      .gte("created_at", periodStartInstant)
      .lt("created_at", periodEndInstant),
    supabase
      .from("tips")
      .select("id, amount_cents")
      .gte("created_at", periodStartInstant)
      .lt("created_at", periodEndInstant),
    supabase.from("memberships").select("id, monthly_price").eq("status", "active"),
  ]);

  const apptRevenue = (paidAppts ?? []).reduce((sum, a) => sum + Number(a.price), 0);
  const onlineApptRevenue = (paidAppts ?? [])
    .filter((a) => a.payment_method === "online")
    .reduce((sum, a) => sum + Number(a.price), 0);
  const inPersonApptRevenue = apptRevenue - onlineApptRevenue;
  const packRevenue = (paidPacks ?? []).reduce((sum, p) => sum + Number(p.total_price), 0);
  const tipRevenue = (periodTips ?? []).reduce((sum, t) => sum + t.amount_cents, 0) / 100;
  const confirmedTotal = apptRevenue + packRevenue + tipRevenue;
  const refundsIssued = (refundedAppts ?? []).reduce((sum, a) => sum + Number(a.price), 0);

  const membershipEstimate = (activeMemberships ?? []).reduce(
    (sum, m) => sum + Number(m.monthly_price ?? 0),
    0,
  );

  const byService = new Map<string, number>();
  for (const a of paidAppts ?? []) {
    byService.set(a.service, (byService.get(a.service) ?? 0) + Number(a.price));
  }
  const serviceBreakdown = [...byService.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Revenue Report
      </h1>
      <p className="mt-3 text-sm text-muted">
        Confirmed payments only — online payments, in-person appointments
        you&apos;ve marked paid, groom packs, and tips. Doesn&apos;t include
        in-person appointments you haven&apos;t marked paid yet, or estimated
        membership billing (shown separately below).
      </p>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Link
          href={`/admin/revenue?month=${prevMonth}`}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          ← Previous month
        </Link>
        <p className="text-center font-serif text-lg text-foreground">
          {monthLabel(month)}
        </p>
        <Link
          href={`/admin/revenue?month=${nextMonth}`}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Next month →
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-accent-tint p-6 text-center">
        <p className="text-sm font-medium text-foreground/80">
          Confirmed Revenue
        </p>
        <p className="mt-1 font-serif text-4xl text-accent-dark">
          ${money(confirmedTotal)}
        </p>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Appointments
          </p>
          <p className="mt-1 font-serif text-2xl text-foreground">
            ${money(apptRevenue)}
          </p>
          <p className="mt-1 text-xs text-muted">
            ${money(onlineApptRevenue)} online · ${money(inPersonApptRevenue)}{" "}
            in person
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Groom Packs
          </p>
          <p className="mt-1 font-serif text-2xl text-foreground">
            ${money(packRevenue)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Tips
          </p>
          <p className="mt-1 font-serif text-2xl text-foreground">
            ${money(tipRevenue)}
          </p>
        </div>
      </section>

      {refundsIssued > 0 && (
        <p className="mt-4 text-sm text-muted">
          ↩ ${money(refundsIssued)} refunded this month (already excluded
          from the total above).
        </p>
      )}

      {serviceBreakdown.length > 0 && (
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-lg text-foreground">
            Appointment Revenue by Service
          </h2>
          <div className="mt-4 space-y-2">
            {serviceBreakdown.map(([service, total]) => (
              <div
                key={service}
                className="flex items-baseline justify-between text-sm"
              >
                <span className="text-foreground/90">
                  {formatServiceLabel(service)}
                </span>
                <span className="font-medium text-accent-dark">
                  ${money(total)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          Estimated Recurring Membership Revenue
        </h2>
        <p className="mt-1 text-sm text-muted">
          Not included in the total above — this is a run-rate estimate
          ({activeMemberships?.length ?? 0} active membership
          {(activeMemberships?.length ?? 0) === 1 ? "" : "s"} × their monthly
          price), not confirmed billing history. Stripe charges members
          automatically each month, but the site doesn&apos;t currently
          record whether any individual monthly charge actually succeeded.
        </p>
        <p className="mt-3 font-serif text-2xl text-accent-dark">
          ~${money(membershipEstimate)}/mo
        </p>
      </section>
    </div>
  );
}
