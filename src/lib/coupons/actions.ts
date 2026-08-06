"use server";

import { createServiceClient } from "@/lib/supabase/service";

export interface CustomerCoupon {
  id: string;
  discountPercent: number | null;
  discountAmount: number | null;
  note: string | null;
}

// Finds a customer's oldest still-unused coupon, if any. Unlike sitewide
// promotions, coupons aren't scheduled or capped — they're just valid
// until redeemed once. Uses a service-role client since this is looked up
// during signed-out-adjacent contexts (e.g. before the booking form has
// fully settled) as well as from server actions.
export async function getCustomerCoupon(
  customerId: string,
): Promise<CustomerCoupon | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("coupons")
    .select("id, discount_percent, discount_amount, note")
    .eq("customer_id", customerId)
    .is("used_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    discountPercent: data.discount_percent,
    discountAmount: data.discount_amount,
    note: data.note,
  };
}
