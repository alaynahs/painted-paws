"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface CustomerCoupon {
  id: string;
  discountPercent: number | null;
  discountAmount: number | null;
  note: string | null;
}

// Finds a customer's most recently obtained still-unused coupon, if any.
// Newest-first (not oldest) so that redeeming a coupon code takes
// precedence over an older dormant personal coupon sitting on the same
// account — otherwise a customer could type a code, see its discount
// applied client-side, but have an unrelated older coupon silently used
// instead at actual checkout. Unlike sitewide promotions, coupons aren't
// scheduled or capped — they're just valid until redeemed once. Uses a
// service-role client since this is looked up during signed-out-adjacent
// contexts (e.g. before the booking form has fully settled) as well as
// from server actions.
export async function getCustomerCoupon(
  customerId: string,
): Promise<CustomerCoupon | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("coupons")
    .select("id, discount_percent, discount_amount, note")
    .eq("customer_id", customerId)
    .is("used_at", null)
    .order("created_at", { ascending: false })
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

export interface RedeemCodeResult {
  success: boolean;
  error?: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
}

// A "code" row (customer_id null) is just a template — redeeming one spawns
// a normal personal-coupon row for this customer that points back at it via
// source_code_id, so it flows through the exact same used_at/burn-on-payment
// lifecycle every other coupon already does. Uses the service-role client
// throughout since a customer redeeming a shared code isn't covered by the
// admin-only write policy on `coupons`.
export async function redeemCouponCode(code: string): Promise<RedeemCodeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Please log in first." };

  const normalized = code.trim().toUpperCase();
  if (!normalized) return { success: false, error: "Enter a code." };

  const serviceClient = createServiceClient();

  const { data: def } = await serviceClient
    .from("coupons")
    .select("id, discount_percent, discount_amount, max_redemptions, expires_at")
    .is("customer_id", null)
    .eq("code", normalized)
    .maybeSingle();

  if (!def) return { success: false, error: "That code isn't valid." };

  if (def.expires_at && new Date(def.expires_at).getTime() < Date.now()) {
    return { success: false, error: "That code has expired." };
  }

  const { data: existingRedemption } = await serviceClient
    .from("coupons")
    .select("id")
    .eq("source_code_id", def.id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (existingRedemption) {
    return { success: false, error: "You've already used this code." };
  }

  if (def.max_redemptions != null) {
    const { count } = await serviceClient
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("source_code_id", def.id);
    if ((count ?? 0) >= def.max_redemptions) {
      return { success: false, error: "That code has reached its redemption limit." };
    }
  }

  const { error: insertError } = await serviceClient.from("coupons").insert({
    customer_id: user.id,
    discount_percent: def.discount_percent,
    discount_amount: def.discount_amount,
    source_code_id: def.id,
  });

  if (insertError) {
    return { success: false, error: "Could not apply that code. Please try again." };
  }

  return {
    success: true,
    discountPercent: def.discount_percent,
    discountAmount: def.discount_amount,
  };
}
