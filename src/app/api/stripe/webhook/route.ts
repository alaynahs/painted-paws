import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendBookingNotifications, notifyAdminCheckoutAbandoned } from "@/app/book/actions";

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

    if (appointmentId) {
      const supabase = createServiceClient();
      await supabase
        .from("appointments")
        .update({ payment_status: "paid" })
        .eq("id", appointmentId);

      const { data: appt } = await supabase
        .from("appointments")
        .select(
          "customer_id, pet_id, appointment_date, appointment_hour, appointment_minute, service, price, coupon_id, pets(name, rabies_vaccine_path)",
        )
        .eq("id", appointmentId)
        .single();

      if (appt) {
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

        // Only burn the coupon once payment actually confirms — an
        // abandoned checkout leaves it available to try again.
        if (appt.coupon_id) {
          await supabase
            .from("coupons")
            .update({ used_at: new Date().toISOString(), redeemed_appointment_id: appointmentId })
            .eq("id", appt.coupon_id);
        }
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

    if (appointmentId) {
      const supabase = createServiceClient();
      const { data: cancelled } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("payment_status", "unpaid")
        .select("id");

      if (cancelled && cancelled.length > 0) {
        await notifyAdminCheckoutAbandoned(supabase, appointmentId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
