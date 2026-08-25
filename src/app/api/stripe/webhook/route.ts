import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendBookingNotifications, notifyAdminCheckoutAbandoned } from "@/app/book/actions";
import {
  markCouponsUsedForAppointment,
  releaseCouponsForAppointment,
} from "@/lib/coupons/actions";
import { notifyEmail } from "@/lib/notifications/service";
import { BUSINESS_EMAIL, tipReceivedEmail } from "@/lib/notifications/templates";

// Shared by the single-appointment "Pay Now" flow and the "pay for all
// upcoming services" bulk flow — both land here paying one appointment at a
// time so a partial failure part-way through a bulk checkout still marks
// whatever it reached.
async function markAppointmentPaid(
  supabase: ReturnType<typeof createServiceClient>,
  appointmentId: string,
  paymentIntentId: string | null,
  // Set for a deposit/remainder-balance checkout — anything else (a plain
  // full payment, or the bulk "pay all upcoming" flow) marks the
  // appointment fully paid outright, same as always.
  paymentPortion?: "deposit" | "remainder",
  amountPaidNowCents?: number,
) {
  const { data: current } = await supabase
    .from("appointments")
    .select("price, amount_paid")
    .eq("id", appointmentId)
    .single();

  if (!current) return;

  let newAmountPaid: number;
  let newStatus: "paid" | "deposit_paid";

  if (paymentPortion) {
    const amountNow = (amountPaidNowCents ?? 0) / 100;
    newAmountPaid = Math.round(((current.amount_paid ?? 0) + amountNow) * 100) / 100;
    // Small epsilon guards against a fractional-cent rounding mismatch
    // between what was quoted and what Stripe actually collected.
    newStatus = newAmountPaid >= current.price - 0.01 ? "paid" : "deposit_paid";
  } else {
    newAmountPaid = current.price;
    newStatus = "paid";
  }

  await supabase
    .from("appointments")
    .update({
      payment_status: newStatus,
      amount_paid: newAmountPaid,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", appointmentId);

  // A deposit or remainder installment doesn't re-send the full "you're
  // booked" notification set — that already went out at booking time (or
  // on whichever payment first confirmed it), and resending it here would
  // just be a confusing duplicate for what's really just a payment update.
  if (paymentPortion) return;

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "customer_id, pet_id, appointment_date, appointment_hour, appointment_minute, service, price, pets(name, rabies_vaccine_path)",
    )
    .eq("id", appointmentId)
    .single();

  if (!appt) return;

  const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
  await sendBookingNotifications(supabase, {
    customerId: appt.customer_id,
    petId: appt.pet_id,
    petName: pet?.name ?? "Pet",
    appointmentId,
    date: appt.appointment_date,
    hour: appt.appointment_hour,
    minute: appt.appointment_minute,
    rabiesVaccinePath: pet?.rabies_vaccine_path ?? null,
    service: appt.service,
    price: appt.price,
  });

  // Only burn any stacked coupons once payment actually confirms — an
  // abandoned checkout leaves them available to try again (see
  // releaseCouponsForAppointment on the cancellation/expiry side).
  await markCouponsUsedForAppointment(appointmentId);
}

// Stripe is the source of truth for whether money actually changed hands —
// the success_url redirect alone can't be trusted (a customer could visit it
// without paying), so payment_status only flips to "paid" here, once Stripe
// confirms the checkout session actually completed.
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const appointmentId = session.metadata?.appointmentId;
    const packId = session.metadata?.packId;
    const membershipId = session.metadata?.membershipId;
    const isTip = session.metadata?.kind === "tip";

    // Tip checkout sessions also carry appointmentId (so the tip can be
    // tied to the right visit), which would otherwise fall straight into
    // the appointment-payment branch below and incorrectly re-mark the
    // appointment paid + resend its booking confirmation.
    if (isTip && appointmentId) {
      const supabase = createServiceClient();
      const customerId = session.metadata?.customerId;
      const amountCents = session.amount_total ?? 0;

      if (customerId && amountCents > 0) {
        await supabase.from("tips").insert({
          appointment_id: appointmentId,
          customer_id: customerId,
          amount_cents: amountCents,
        });

        const { data: appt } = await supabase
          .from("appointments")
          .select("pets(name), profiles:customer_id(full_name)")
          .eq("id", appointmentId)
          .single();

        const pet = Array.isArray(appt?.pets) ? appt.pets[0] : appt?.pets;
        const profile = Array.isArray(appt?.profiles)
          ? appt.profiles[0]
          : appt?.profiles;

        await notifyEmail(
          supabase,
          { customerId, appointmentId, email: BUSINESS_EMAIL },
          "tip_received",
          tipReceivedEmail({
            customerName: profile?.full_name || "Unknown",
            petName: pet?.name ?? "Pet",
            amount: (amountCents / 100).toFixed(2),
          }),
        );
      }

      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;
    const paymentPortion = session.metadata?.paymentPortion as
      | "deposit"
      | "remainder"
      | undefined;

    if (appointmentId) {
      await markAppointmentPaid(
        createServiceClient(),
        appointmentId,
        paymentIntentId,
        paymentPortion,
        session.amount_total ?? undefined,
      );
    }

    // The "pay for all upcoming services" bulk checkout from the account
    // page carries every appointment it covers as one comma-separated list,
    // since Stripe metadata values are flat strings — there's no per-line-item
    // metadata to key off instead.
    const appointmentIdsRaw = session.metadata?.appointmentIds;
    if (appointmentIdsRaw) {
      const supabase = createServiceClient();
      for (const id of appointmentIdsRaw.split(",").filter(Boolean)) {
        await markAppointmentPaid(supabase, id, paymentIntentId);
      }
    }

    if (packId) {
      const supabase = createServiceClient();
      await supabase
        .from("groom_credit_packs")
        .update({ payment_status: "paid" })
        .eq("id", packId);
    }

    if (membershipId) {
      const supabase = createServiceClient();
      await supabase
        .from("memberships")
        .update({
          status: "active",
          stripe_subscription_id:
            typeof session.subscription === "string"
              ? session.subscription
              : null,
          stripe_customer_id:
            typeof session.customer === "string" ? session.customer : null,
        })
        .eq("id", membershipId);
    }
  }

  // Fires when a customer abandons Checkout without ever visiting our
  // cancel_url — closing the tab or using the browser's own back button both
  // skip cancel_url entirely, so this is the only reliable server-side
  // signal that they backed out. Only touches appointments still unpaid,
  // so it can never undo a payment that completed in the meantime.
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const appointmentId = session.metadata?.appointmentId;

    // A tip session also carries appointmentId — an abandoned tip should
    // never cancel the actual appointment it's tied to.
    if (appointmentId && session.metadata?.kind !== "tip") {
      const supabase = createServiceClient();
      const { data: cancelled } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("payment_status", "unpaid")
        .select("id");

      if (cancelled && cancelled.length > 0) {
        await releaseCouponsForAppointment(appointmentId);
        await notifyAdminCheckoutAbandoned(supabase, appointmentId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
