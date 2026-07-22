import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelAppointment } from "@/app/book/actions";
import BookingFlow from "@/components/booking-flow";
import {
  CAT_ADD_ONS,
  CREATIVE_TIER_LABELS,
  DOG_ADD_ONS,
  PACKAGE_LABELS,
  type CreativeTier,
  type PackageTier,
} from "@/lib/pricing/pricing";

export default async function EditAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*, pets(*)")
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();

  if (!appointment || !appointment.pets) notFound();

  const cancelWithId = cancelAppointment.bind(null, appointment.id);

  const addOns: string[] = appointment.add_ons ?? [];
  const catalog =
    appointment.pets.species === "dog" ? DOG_ADD_ONS : CAT_ADD_ONS;
  const addOnNames = addOns.filter((a) => catalog.some((c) => c.name === a));

  const creativeTier =
    (Object.entries(CREATIVE_TIER_LABELS) as [CreativeTier, string][]).find(
      ([, label]) => addOns.includes(label),
    )?.[0] ?? "none";

  const packageTier =
    (Object.entries(PACKAGE_LABELS) as [PackageTier, string][]).find(
      ([, label]) => addOns.includes(label),
    )?.[0] ?? "none";

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Edit appointment
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {appointment.pets.name}&apos;s Appointment
      </h1>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <div className="mt-8">
        <BookingFlow
          pets={[appointment.pets]}
          mode="edit"
          appointmentId={appointment.id}
          initial={{
            service: appointment.service,
            deshed: addOns.includes("De-shed treatment"),
            creativeTier,
            addOnNames,
            packageTier,
            standalone: appointment.service === "standalone",
            date: appointment.appointment_date,
            hour: appointment.appointment_hour,
            paymentMethod: appointment.payment_method,
            customerNote: appointment.customer_note ?? "",
          }}
        />
      </div>

      <form action={cancelWithId} className="mt-6">
        <button
          type="submit"
          className="text-sm text-muted hover:text-foreground"
        >
          Cancel this appointment
        </button>
      </form>
    </div>
  );
}
