import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import TipSelector from "@/components/tip-selector";
import { REVIEW_LINK } from "@/lib/notifications/templates";

// Reached from the "ready for pickup" text — public, no login, since it's a
// one-tap link sent straight to the customer's phone.
export default async function LeaveReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipped?: string; error?: string }>;
}) {
  const { id } = await params;
  const { tipped, error } = await searchParams;
  const supabase = createServiceClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, price, pets(name)")
    .eq("id", id)
    .single();

  if (!appointment) notFound();

  const pet = Array.isArray(appointment.pets)
    ? appointment.pets[0]
    : appointment.pets;

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Thank you!
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {pet?.name ?? "Your pet"} is all set 🐾
      </h1>
      <p className="mt-3 text-muted">
        Thanks so much for trusting us with {pet?.name ?? "your pet"} today —
        we&apos;d love to hear how it went.
      </p>

      {tipped && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          Tip sent — thank you so much for your generosity!
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <a
        href={REVIEW_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-block rounded-full bg-accent px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
      >
        ⭐ Leave a Review
      </a>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-left">
        <TipSelector appointmentId={appointment.id} price={appointment.price} />
      </div>
    </div>
  );
}
