"use server";

import { createClient } from "@/lib/supabase/server";
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

export interface AnnounceableCoupon {
  id: string;
  discountPercent: number | null;
  discountAmount: number | null;
}

// Finds the current user's oldest coupon that hasn't been announced with
// the welcome popup yet — separate from redemption (used_at), so this
// still returns null once shown, even if the coupon itself is still sitting
// unused and available to redeem at a future booking.
export async function getUnannouncedCoupon(): Promise<AnnounceableCoupon | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("coupons")
    .select("id, discount_percent, discount_amount")
    .eq("customer_id", user.id)
    .eq("popup_shown", false)
    .is("used_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    discountPercent: data.discount_percent,
    discountAmount: data.discount_amount,
  };
}

// coupons' RLS only allows admin writes, so marking this as shown needs the
// service-role client — but it's still scoped to the verified logged-in
// user's own coupon (matched by customer_id), never an arbitrary id.
export async function markCouponAnnounced(couponId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await createServiceClient()
    .from("coupons")
    .update({ popup_shown: true })
    .eq("id", couponId)
    .eq("customer_id", user.id);
}
