import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, updateEmail } from "@/app/account/actions";
import { logout } from "@/app/auth/actions";
import ThemeToggle from "@/components/theme-toggle";
import ContactInfoCard from "@/components/contact-info-card";
import TrackBookingConfirmed from "@/components/track-booking-confirmed";
import CancelAppointmentButton from "@/components/cancel-appointment-button";
import UnpaidAppointmentsPopup from "@/components/unpaid-appointments-popup";
import { payAppointmentNow, payAllUnpaidAppointmentsNow } from "@/app/book/actions";
import { updatePasswordFromAccount } from "@/app/auth/actions";
import MembershipCard from "@/components/membership-card";
import PastAppointmentsList from "@/components/past-appointments-list";
import { formatDate, formatHour, todayInCentral } from "@/lib/format";
import {
  formatServiceLabel,
  GROOM_PACK_SERVICE_LABELS,
  type GroomPackService,
} from "@/lib/pricing/pricing";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    saved?: string;
    booked?: string;
    session_id?: string;
    value?: string;
  }>;
}) {
  const {
    error,
    message,
    saved,
    booked,
    session_id: sessionId,
    value,
  } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: pets } = await supabase
    .from("pets")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, pets(name)")
    .eq("customer_id", user.id)
    .order("appointment_date", { ascending: false })
    .order("appointment_hour", { ascending: false })
    .order("appointment_minute", { ascending: false });

  const todayStr = todayInCentral();
  const upcomingAppointments = (appointments ?? [])
    .filter((a) => a.appointment_date >= todayStr && a.status !== "cancelled")
    .sort((a, b) =>
      a.appointment_date === b.appointment_date
        ? a.appointment_hour * 60 +
          a.appointment_minute -
          (b.appointment_hour * 60 + b.appointment_minute)
        : a.appointment_date.localeCompare(b.appointment_date),
    );
  const CANCELLED_VISIBLE_MS = 48 * 60 * 60 * 1000;
  const now = new Date().getTime();
  const pastAppointments = (appointments ?? [])
    .filter((a) => {
      if (a.status === "cancelled") {
        return (
          !!a.cancelled_at &&
          now - new Date(a.cancelled_at).getTime() < CANCELLED_VISIBLE_MS
        );
      }
      return a.appointment_date < todayStr;
    });

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*, pets(name)")
    .eq("customer_id", user.id)
    .eq("status", "active");

  const { data: groomPacks } = await supabase
    .from("groom_credit_packs")
    .select("*, pets(name)")
    .eq("customer_id", user.id)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false });

  const activeGroomPacks = (groomPacks ?? []).filter(
    (p) => p.credits_used < p.paid_count + p.free_count,
  );

  const { data: coupons } = await supabase
    .from("coupons")
    .select("id, discount_percent, discount_amount, note, used_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const unpaidOnlineAppointments = upcomingAppointments
    .filter(
      (a) => a.payment_method === "online" && a.payment_status === "unpaid",
    )
    .map((a) => ({
      id: a.id,
      petName: a.pets?.name ?? "Pet",
      date: a.appointment_date,
      hour: a.appointment_hour,
      minute: a.appointment_minute,
      price: a.price,
    }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Your account
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {profile?.full_name ? `Hi, ${profile.full_name}` : "Your Account"}
      </h1>

      {booked && (
        <>
          {sessionId && (
            <TrackBookingConfirmed sessionId={sessionId} value={value ? Number(value) : undefined} />
          )}
          <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
            You&apos;re booked! See the details below.
          </p>
        </>
      )}
      {saved && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          Saved.
        </p>
      )}
      {message && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <UnpaidAppointmentsPopup
        appointments={unpaidOnlineAppointments}
        payAction={payAllUnpaidAppointmentsNow}
      />

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">
            Upcoming Appointments
          </h2>
          <Link
            href="/book"
            className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
          >
            + Book an Appointment
          </Link>
        </div>

        {upcomingAppointments.length > 0 ? (
          <div className="mt-4 space-y-3">
            {upcomingAppointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-serif text-base text-foreground">
                    {appt.pets?.name} · {formatDate(appt.appointment_date)} at{" "}
                    {formatHour(appt.appointment_hour, appt.appointment_minute)}
                  </p>
                  <p className="text-sm font-medium text-accent-dark">
                    ${appt.price}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatServiceLabel(appt.service)}
                  {appt.add_ons?.length > 0 && ` · ${appt.add_ons.join(", ")}`}
                  {" · "}
                  {appt.payment_method === "online"
                    ? appt.payment_status === "paid"
                      ? "Paid online"
                      : appt.payment_status === "refunded"
                        ? "Refunded"
                        : appt.payment_status === "deposit_paid"
                          ? "Partially paid"
                          : "Pay online (unpaid)"
                    : "Pay in person"}
                  {" · "}
                  {appt.status}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/account/appointments/${appt.id}`}
                    className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
                  >
                    Edit
                  </Link>
                  <CancelAppointmentButton appointmentId={appt.id} />
                  {appt.payment_method === "online" &&
                    // Deliberately excludes "deposit_paid" — that
                    // appointment already has a partial payment on record,
                    // and the remaining-balance link is admin-sent (see
                    // sendPaymentLinkEmail), not a customer self-serve full
                    // charge that would double up on the deposit.
                    appt.payment_status === "unpaid" && (
                      <form action={payAppointmentNow.bind(null, appt.id)}>
                        <button
                          type="submit"
                          className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                        >
                          Pay Now (${appt.price})
                        </button>
                      </form>
                    )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No upcoming appointments yet.
          </p>
        )}
      </section>

      <PastAppointmentsList
        appointments={pastAppointments}
        payAppointmentNowAction={payAppointmentNow}
      />

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">Your Pets</h2>
          <Link
            href="/account/pets/new"
            className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
          >
            + Add a Pet
          </Link>
        </div>

        {pets && pets.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/account/pets/${pet.id}`}
                className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent-dark"
              >
                <p className="font-serif text-base text-foreground">
                  {pet.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {pet.breed} · {pet.weight_lb} lb
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No pets saved yet. Add one to get started booking.
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">Membership</h2>
          <Link
            href="/membership"
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Manage
          </Link>
        </div>
        {memberships && memberships.length > 0 ? (
          <div className="mt-4 space-y-3">
            {memberships.map((m) => (
              <MembershipCard key={m.id} membership={m} showCancel={false} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Not enrolled in a membership yet.
          </p>
        )}

        <div className="mt-6 border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
              Groom Packs
            </h3>
            <Link
              href="/membership"
              className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
            >
              Buy a pack
            </Link>
          </div>
          {activeGroomPacks.length > 0 ? (
            <div className="mt-4 space-y-3">
              {activeGroomPacks.map((pack) => {
                const remaining =
                  pack.paid_count + pack.free_count - pack.credits_used;
                return (
                  <div
                    key={pack.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <p className="font-serif text-base text-foreground">
                      {pack.pets?.name ?? "Pet"} ·{" "}
                      {
                        GROOM_PACK_SERVICE_LABELS[
                          pack.service as GroomPackService
                        ]
                      }
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {remaining} of {pack.paid_count + pack.free_count}{" "}
                      credit{pack.paid_count + pack.free_count === 1 ? "" : "s"}{" "}
                      remaining
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No groom packs yet. Pre-purchase a batch of Baths or Full
              Grooms and get extra visits free.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">Your Coupons</h2>
        {coupons && coupons.length > 0 ? (
          <div className="mt-4 space-y-3">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-serif text-base text-foreground">
                    {c.discount_percent != null
                      ? `${c.discount_percent}% off`
                      : `$${c.discount_amount} off`}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      c.used_at
                        ? "bg-border text-muted"
                        : "bg-accent-tint text-accent-dark"
                    }`}
                  >
                    {c.used_at ? "Used" : "Available"}
                  </span>
                </div>
                {c.note && (
                  <p className="mt-1 text-xs text-muted">{c.note}</p>
                )}
                {!c.used_at && (
                  <p className="mt-1 text-xs text-muted">
                    Automatically applied at your next booking.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No coupons on your account right now.
          </p>
        )}
      </section>

      <ContactInfoCard
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
        email={user.email ?? ""}
        updateProfileAction={updateProfile}
        updateEmailAction={updateEmail}
        updatePasswordAction={updatePasswordFromAccount}
      />

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">Appearance</h2>
        <p className="mt-1 text-sm text-muted">
          Switch to a dark theme for your account pages.
        </p>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </section>

      <form action={logout} className="mt-8">
        <button type="submit" className="text-sm text-muted hover:text-foreground">
          Log out
        </button>
      </form>
    </div>
  );
}
