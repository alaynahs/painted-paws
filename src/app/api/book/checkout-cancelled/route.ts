import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdminCheckoutAbandoned } from "@/app/book/actions";

// Stripe redirects here when a customer backs out of payment instead of
// completing it. An unpaid appointment left sitting in the schedule still
// occupies a real time slot, so cancel it outright rather than leaving a
// phantom "booked" hold that blocks other customers from taking that slot.
export async function GET(request: NextRequest) {
  const appointmentId = request.nextUrl.searchParams.get("appointmentId");

  if (appointmentId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: cancelled } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("customer_id", user.id)
        .eq("payment_status", "unpaid")
        .select("id");

      if (cancelled && cancelled.length > 0) {
        await notifyAdminCheckoutAbandoned(supabase, appointmentId);
      }
    }
  }

  const message =
    "Your booking wasn't confirmed since payment wasn't completed. Please book again if you'd still like this appointment.";
  return NextResponse.redirect(
    `${request.nextUrl.origin}/account?message=${encodeURIComponent(message)}`,
  );
}
