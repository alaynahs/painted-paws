import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { getPricingConfig } from "@/lib/pricing/config";
import { formatDate, formatHour, todayInCentral } from "@/lib/format";
import AdminMultiPetBooking from "@/components/admin-multi-pet-booking";

export default async function AdminBookCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ error?: string; booked?: string }>;
}) {
  const { customerId } = await params;
  const { error, booked } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email")
    .eq("id", customerId)
    .single();

  if (!profile) notFound();

  const [{ data: pets }, { data: upcoming }, config] = await Promise.all([
    supabase
      .from("pets")
      .select("*")
      .eq("owner_id", customerId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, appointment_date, appointment_hour, appointment_minute, pets(name)")
      .eq("customer_id", customerId)
      .neq("status", "cancelled")
      .gte("appointment_date", todayInCentral())
      .order("appointment_date", { ascending: true })
      .order("appointment_hour", { ascending: true }),
    getPricingConfig(),
  ]);

  const upcomingList = (upcoming ?? []).map((a) => {
    const pet = Array.isArray(a.pets) ? a.pets[0] : a.pets;
    return {
      id: a.id,
      label: `${pet?.name ?? "Pet"} — ${formatDate(a.appointment_date)} at ${formatHour(a.appointment_hour, a.appointment_minute)}`,
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin · Book for a Customer
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {profile.full_name ?? "Unknown"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {profile.phone}
        {profile.phone && profile.email ? " · " : ""}
        {profile.email}
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}
      {booked && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          ✓ Booked for {booked}. Pick another pet below to book another, or
          you&apos;re done.
        </p>
      )}

      {upcomingList.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-accent-dark uppercase">
            Already on the books
          </p>
          <ul className="mt-2 space-y-1">
            {upcomingList.map((a) => (
              <li key={a.id} className="text-sm text-foreground/90">
                {a.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pets && pets.length > 0 ? (
        <div className="mt-8">
          <AdminMultiPetBooking
            customerId={profile.id}
            pets={pets}
            config={config}
          />
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted">
          This customer has no pets on file yet.
        </p>
      )}
    </div>
  );
}
