"use server";

import { createClient } from "@/lib/supabase/server";

// Checkpoints worth tracking client-side — everything after that
// ("booked", "paid") is already knowable from the appointments table
// itself (created_at, payment_status), so there's no need to duplicate it
// here just to answer "where do people drop off."
//
// visitorId covers logged-out visitors (e.g. the homepage, which anyone can
// reach without an account) — falls back to it only when there's no real
// logged-in customer to attribute the event to.
export async function logBookingStep(
  step: "landed" | "picked_time" | "landed_home",
  visitorId?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !visitorId) return;

  await supabase.from("booking_funnel_events").insert(
    user
      ? { customer_id: user.id, step }
      : { visitor_id: visitorId, step },
  );
}
