"use server";

import { createClient } from "@/lib/supabase/server";

// Only two checkpoints worth tracking client-side — everything after that
// ("booked", "paid") is already knowable from the appointments table
// itself (created_at, payment_status), so there's no need to duplicate it
// here just to answer "where do people drop off."
export async function logBookingStep(step: "landed" | "picked_time") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("booking_funnel_events").insert({
    customer_id: user.id,
    step,
  });
}
