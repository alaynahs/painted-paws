import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { formatDate, formatDateTime, formatHour } from "@/lib/format";

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, do_not_book, created_at")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  // Account creation / last login live on Supabase's own auth.users record,
  // not our profiles table — only fetchable with the service role, since
  // it's a privileged admin API call, not a regular table read.
  const { data: authUser } = await createServiceClient().auth.admin.getUserById(id);
  const lastLoginAt = formatDateTime(authUser?.user?.last_sign_in_at);
  const accountCreatedAt = formatDateTime(profile.created_at);

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, species, breed")
    .eq("owner_id", id)
    .order("created_at", { ascending: true });

  const { data: coupons } = await supabase
    .from("coupons")
    .select("id, discount_percent, discount_amount, note, used_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const { data: waivers } = await supabase
    .from("waiver_signings")
    .select(
      "id, signed_name, signed_date, vaccinated_last_24h, behavioral_concerns, behavioral_note, senior_or_special_needs, senior_note, severely_matted, matted_note, photo_release_consent, liability_accepted, pets(name), appointments(appointment_date, appointment_hour)",
    )
    .eq("customer_id", id)
    .order("signed_date", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin · Customer
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {profile.full_name ?? "Unknown"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {profile.phone}
        {profile.phone && profile.email ? " · " : ""}
        {profile.email}
      </p>
      <p className="mt-1 text-xs text-muted">
        {accountCreatedAt && `Account created ${accountCreatedAt}`}
        {accountCreatedAt && lastLoginAt ? " · " : ""}
        {lastLoginAt && `Last logged in ${lastLoginAt}`}
      </p>
      {profile.do_not_book && (
        <p className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
          Blocked from booking
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">Pets</h2>
          <Link
            href={`/admin/pets/new?customerId=${profile.id}`}
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
                href={`/admin/pets/${pet.id}`}
                className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent-dark"
              >
                <p className="font-serif text-base text-foreground">
                  {pet.name}
                </p>
                <p className="mt-1 text-xs text-muted">{pet.breed}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No pets saved for this customer yet.
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">Coupons</h2>
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
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No coupons on this account.
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          Signed Waivers
        </h2>
        {waivers && waivers.length > 0 ? (
          <div className="mt-4 space-y-3">
            {waivers.map((w) => {
              const pet = Array.isArray(w.pets) ? w.pets[0] : w.pets;
              const appt = Array.isArray(w.appointments)
                ? w.appointments[0]
                : w.appointments;
              return (
                <div
                  key={w.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-serif text-base text-foreground">
                      {pet?.name ?? "Pet"}
                      {appt
                        ? ` · ${formatDate(appt.appointment_date)} at ${formatHour(appt.appointment_hour)}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted">
                      Signed {formatDate(w.signed_date)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Signed by: {w.signed_name}
                  </p>
                  <div className="mt-3 grid gap-1.5 text-xs text-foreground/90 sm:grid-cols-2">
                    <p>
                      Vaccinated in last 24h:{" "}
                      <span className="font-medium">
                        {w.vaccinated_last_24h ? "Yes" : "No"}
                      </span>
                    </p>
                    <p>
                      Liability accepted:{" "}
                      <span className="font-medium">
                        {w.liability_accepted ? "Yes" : "No"}
                      </span>
                    </p>
                    <p>
                      Photo/media consent:{" "}
                      <span className="font-medium">
                        {w.photo_release_consent ? "Yes" : "No"}
                      </span>
                    </p>
                    <p>
                      Behavioral concerns:{" "}
                      <span className="font-medium">
                        {w.behavioral_concerns ? "Yes" : "No"}
                      </span>
                    </p>
                    <p>
                      Senior / special needs:{" "}
                      <span className="font-medium">
                        {w.senior_or_special_needs ? "Yes" : "No"}
                      </span>
                    </p>
                    <p>
                      Severely matted:{" "}
                      <span className="font-medium">
                        {w.severely_matted ? "Yes" : "No"}
                      </span>
                    </p>
                  </div>
                  {w.behavioral_note && (
                    <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
                      <span className="font-medium">Behavioral note:</span>{" "}
                      {w.behavioral_note}
                    </p>
                  )}
                  {w.senior_note && (
                    <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
                      <span className="font-medium">Senior/health note:</span>{" "}
                      {w.senior_note}
                    </p>
                  )}
                  {w.matted_note && (
                    <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
                      <span className="font-medium">Matting note:</span>{" "}
                      {w.matted_note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No waivers signed by this customer yet.
          </p>
        )}
      </section>
    </div>
  );
}
