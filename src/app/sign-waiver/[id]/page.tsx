import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { signAppointmentWaiver } from "@/app/book/actions";
import StandaloneWaiverForm from "@/components/standalone-waiver-form";

// Reached from the "sign the waiver" link in the booking confirmation email
// — public, no login, since it's a one-tap link sent straight to the
// customer's inbox, same pattern as leave-a-review/[id].
export default async function SignWaiverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ signed?: string; error?: string }>;
}) {
  const { id } = await params;
  const { signed, error } = await searchParams;
  const supabase = createServiceClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, appointment_date, pets(name)")
    .eq("id", id)
    .single();

  if (!appointment) notFound();

  const pet = Array.isArray(appointment.pets)
    ? appointment.pets[0]
    : appointment.pets;

  const { data: existingWaiver } = await supabase
    .from("waiver_signings")
    .select("id")
    .eq("appointment_id", id)
    .maybeSingle();

  const alreadySigned = !!existingWaiver || !!signed;

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Grooming Waiver
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {pet?.name ?? "Your pet"}&apos;s Upcoming Visit
      </h1>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      {alreadySigned ? (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          Waiver on file — you&apos;re all set for {pet?.name ?? "your pet"}
          &apos;s visit. See you soon!
        </p>
      ) : (
        <>
          <p className="mt-3 text-muted">
            Please complete the waiver below before {pet?.name ?? "your pet"}
            &apos;s appointment.
          </p>
          <div className="mt-6">
            <StandaloneWaiverForm
              appointmentId={appointment.id}
              action={signAppointmentWaiver}
            />
          </div>
        </>
      )}
    </div>
  );
}
