import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { cancelAppointment, sendPaymentLinkEmail } from "@/app/book/actions";
import { markAppointmentPaid } from "@/app/admin/actions";
import BookingFlow from "@/components/booking-flow";
import QuickMessageButtons from "@/components/quick-message-buttons";
import RefundButton from "@/components/refund-button";
import MarkCompleteButton from "@/components/mark-complete-button";
import {
  CAT_ADD_ON_NAMES,
  CREATIVE_TIER_LABELS,
  DOG_ADD_ON_NAMES,
  PACKAGE_LABELS,
  type CreativeTier,
  type PackageTier,
} from "@/lib/pricing/pricing";
import { getPricingConfig } from "@/lib/pricing/config";

export default async function AdminEditAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*, pets(*), profiles:customer_id(full_name, phone)")
    .eq("id", id)
    .single();

  if (!appointment || !appointment.pets) notFound();

  const cancelWithId = cancelAppointment.bind(null, appointment.id);
  const sendPaymentLinkWithId = sendPaymentLinkEmail.bind(null, appointment.id);
  const markPaidWithId = markAppointmentPaid.bind(null, appointment.id);
  const config = await getPricingConfig();

  let promoDiscountPercent: number | null = null;
  if (appointment.promo_id) {
    const { data: promo } = await supabase
      .from("promotions")
      .select("discount_percent")
      .eq("id", appointment.promo_id)
      .single();
    promoDiscountPercent = promo?.discount_percent ?? null;
  }

  const addOns: string[] = appointment.add_ons ?? [];
  const catalog =
    appointment.pets.species === "dog" ? DOG_ADD_ON_NAMES : CAT_ADD_ON_NAMES;
  const addOnNames = addOns.filter((a) => catalog.includes(a));

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
        Admin · Edit appointment
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {appointment.pets.name}&apos;s Appointment
      </h1>
      <p className="mt-1 text-sm text-muted">
        {appointment.profiles?.full_name ?? "Unknown owner"}
        {appointment.profiles?.phone ? ` · ${appointment.profiles.phone}` : ""}
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}

      <div className="mt-6">
        {appointment.status === "completed" ? (
          <p className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground/90">
            ✓ Marked complete — thank-you email sent
          </p>
        ) : (
          <>
            <MarkCompleteButton appointmentId={appointment.id} />
            <p className="mt-1.5 text-xs text-muted">
              Choose whether the thank-you email asks for just a review, or
              a review and a tip.
            </p>
          </>
        )}
      </div>

      {appointment.payment_status !== "paid" && appointment.payment_status !== "refunded" && (
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={sendPaymentLinkWithId}>
            <button
              type="submit"
              className="rounded-full border border-blue-600 px-6 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
            >
              Email Payment Link (${appointment.price})
            </button>
            <p className="mt-1.5 text-xs text-muted">
              Emails a Stripe payment link straight to the pet parent.
            </p>
          </form>
          <form action={markPaidWithId}>
            <button
              type="submit"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
            >
              Mark Paid
            </button>
            <p className="mt-1.5 text-xs text-muted">
              Confirms payment was collected outside checkout (cash, card
              reader, etc.), so it counts on the revenue report.
            </p>
          </form>
        </div>
      )}

      {appointment.payment_status === "paid" && (
        <div className="mt-4">
          <RefundButton appointmentId={appointment.id} price={appointment.price} />
          <p className="mt-1.5 text-xs text-muted">
            {appointment.stripe_payment_intent_id
              ? "Refunds the actual Stripe charge back to their card."
              : "No Stripe payment on record for this one — refund it directly in the Stripe dashboard instead."}
          </p>
        </div>
      )}

      {appointment.payment_status === "refunded" && (
        <p className="mt-4 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground/90">
          ↩ Refunded
        </p>
      )}

      <div className="mt-4">
        <QuickMessageButtons appointmentId={appointment.id} />
        <p className="mt-1.5 text-xs text-muted">
          On my way, ready for pickup, can&apos;t reach client, and other
          quick updates — sent straight to the pet parent&apos;s email.
        </p>
      </div>

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
            minute: appointment.appointment_minute,
            paymentMethod: appointment.payment_method,
            customerNote: appointment.customer_note ?? "",
            pickupDropoff: appointment.pickup_dropoff ?? false,
            pickupAddress: appointment.pickup_address ?? "",
            promoDiscountPercent,
            advanceBookingDiscount: appointment.advance_booking_discount ?? 0,
          }}
          config={config}
          isAdmin
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
