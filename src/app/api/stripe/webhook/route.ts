import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";

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

  return NextResponse.json({ received: true });
}
