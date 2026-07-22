import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, updateEmail } from "@/app/account/actions";
import { logout } from "@/app/auth/actions";
import ThemeToggle from "@/components/theme-toggle";
import ContactInfoCard from "@/components/contact-info-card";
import CancelAppointmentButton from "@/components/cancel-appointment-button";
import { confirmAppointment, payAppointmentNow } from "@/app/book/actions";
import { updatePasswordFromAccount } from "@/app/auth/actions";
import MembershipCard from "@/components/membership-card";
import ChangePasswordCard from "@/components/change-password-card";
import PastAppointmentsList from "@/components/past-appointments-list";
import { formatDate, formatHour } from "@/lib/format";
import { formatServiceLabel } from "@/lib/pricing/pricing";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    saved?: string;
    booked?: string;
  }>;
}) {
  const { error, message, saved, booked } = await searchParams;
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
    .order("appointment_hour", { ascending: false });

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingAppointments = (appointments ?? [])
    .filter((a) => a.appointment_date >= todayStr && a.status !== "cancelled")
    .sort((a, b) =>
      a.appointment_date === b.appointment_date
        ? a.appointment_hour - b.appointment_hour
        : a.appointment_date.localeCompare(b.appointment_date),
    );
  const pastAppointments = (appointments ?? []).filter(
    (a) => a.appointment_date < todayStr || a.status === "cancelled",
  );

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*, pets(name)")
    .eq("customer_id", user.id)
    .eq("status", "active");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Your account
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {profile?.full_name ? `Hi, ${profile.full_name}` : "Your Account"}
      </h1>

      {profile?.role === "admin" && (
        <Link
          href="/admin"
          className="mt-4 inline-block rounded-full border border-accent-dark px-4 py-1.5 text-xs font-medium text-accent-dark hover:bg-accent-tint"
        >
          Go to Admin Dashboard →
        </Link>
      )}

      {booked && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          You&apos;re booked! See the details below.
        </p>
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
                    {appt.pets?.name} — {formatDate(appt.appointment_date)} at{" "}
                    {formatHour(appt.appointment_hour)}
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
                      : "Pay online (unpaid)"
                    : "Pay in person"}
                  {" · "}
                  {appt.status}
                </p>
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
                  <Link
                    href={`/account/appointments/${appt.id}`}
                    className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
                  >
                    Edit
                  </Link>
                  <CancelAppointmentButton appointmentId={appt.id} />
                  {appt.payment_method === "online" &&
                    appt.payment_status !== "paid" && (
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

      <ContactInfoCard
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
        email={user.email ?? ""}
        updateProfileAction={updateProfile}
        updateEmailAction={updateEmail}
      />

      <ChangePasswordCard updatePasswordAction={updatePasswordFromAccount} />

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
            No pets saved yet — add one to get started booking.
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
      </section>

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
