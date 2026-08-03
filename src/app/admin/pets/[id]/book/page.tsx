import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { adminCreateAppointment } from "@/app/book/actions";
import BookingFlow from "@/components/booking-flow";
import { getPricingConfig } from "@/lib/pricing/config";

export default async function AdminBookForPetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: pet } = await supabase
    .from("pets")
    .select("*, profiles:owner_id(full_name, phone)")
    .eq("id", id)
    .single();

  if (!pet) notFound();

  const config = await getPricingConfig();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin · Book Appointment
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Book for {pet.name}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {pet.profiles?.full_name ?? "Unknown owner"}
        {pet.profiles?.phone ? ` · ${pet.profiles.phone}` : ""}
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}
      {!pet.is_active && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          This pet is marked inactive.
        </p>
      )}

      <div className="mt-8">
        <BookingFlow
          pets={[pet]}
          action={adminCreateAppointment}
          hiddenFields={{ customerId: pet.owner_id }}
          allowOnlinePayment={false}
          config={config}
          isAdmin
        />
      </div>
    </div>
  );
}
