"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/supabase/admin";

export interface CustomerCoupon {
  id: string;
  discountPercent: number | null;
  discountAmount: number | null;
  note: string | null;
}

// Finds every coupon a customer can still stack onto a new booking —
// newest first, same ordering the old single-coupon lookup used (so a
// freshly redeemed code still shows first in the list). A coupon that's
// already reserved against a different pending appointment (see
// reserveCouponsForAppointment below) is excluded even though it isn't
// "used" yet — otherwise the same coupon could be applied to two separate
// bookings at once, one of which would fail to actually redeem it later.
// Unlike sitewide promotions, coupons aren't scheduled or capped — they're
// just valid until redeemed once. Uses a service-role client since this is
// looked up during signed-out-adjacent contexts (e.g. before the booking
// form has fully settled) as well as from server actions.
export async function getCustomerCoupons(
  customerId: string,
): Promise<CustomerCoupon[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("coupons")
    .select("id, discount_percent, discount_amount, note")
    .eq("customer_id", customerId)
    .is("used_at", null)
    .is("redeemed_appointment_id", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((c) => ({
    id: c.id,
    discountPercent: c.discount_percent,
    discountAmount: c.discount_amount,
    note: c.note,
  }));
}

// These three all write to the coupons table, which RLS locks to
// admin-only writes (customers can only ever read their own rows) — so
// each uses a service-role client itself rather than accepting whatever
// client the caller has, the same way getCustomerCoupons above does.
// That's safe here specifically because every caller already resolved
// the coupon ids/appointment id from the authenticated customer's own
// session before reaching these.

// Reserves a batch of coupons against a just-created appointment, without
// marking them used yet — that only happens once payment actually confirms
// (see markCouponsUsedForAppointment). Reserving up front is what keeps the
// same coupon from being stacked onto a second, unrelated booking while
// this one is still pending payment.
export async function reserveCouponsForAppointment(
  couponIds: string[],
  appointmentId: string,
) {
  if (couponIds.length === 0) return;
  const supabase = createServiceClient();
  await supabase
    .from("coupons")
    .update({ redeemed_appointment_id: appointmentId })
    .in("id", couponIds);
}

// Releases any coupons still reserved-but-unused for an appointment that
// didn't end up going through (cancelled, or its checkout expired unpaid)
// — back into the pool so the customer can actually use them on a future
// booking instead of them being silently stuck.
export async function releaseCouponsForAppointment(appointmentId: string) {
  const supabase = createServiceClient();
  await supabase
    .from("coupons")
    .update({ redeemed_appointment_id: null })
    .eq("redeemed_appointment_id", appointmentId)
    .is("used_at", null);
}

// Marks every coupon reserved for an appointment as actually spent, once
// its payment is confirmed — replaces the old single coupon_id lookup so
// any number of stacked coupons get redeemed together.
export async function markCouponsUsedForAppointment(appointmentId: string) {
  const supabase = createServiceClient();
  await supabase
    .from("coupons")
    .update({ used_at: new Date().toISOString() })
    .eq("redeemed_appointment_id", appointmentId)
    .is("used_at", null);
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

export interface FeaturedCouponCode {
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
}

// The one coupon code (if any) the admin has chosen to advertise in the
// site-wide banner — purely an announcement, unlike a promotions-table
// promo. Still requires the customer to actually type the code in at
// checkout; this just tells them it exists. Falls back to null once the
// code expires or hits its redemption cap, same as an automatic promotion
// disappearing from the banner.
export async function getFeaturedCouponCode(): Promise<FeaturedCouponCode | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("coupons")
    .select("id, code, discount_percent, discount_amount, max_redemptions, expires_at")
    .is("customer_id", null)
    .eq("featured_banner", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;

  if (data.max_redemptions != null) {
    const { count } = await supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("source_code_id", data.id);
    if ((count ?? 0) >= data.max_redemptions) return null;
  }

  return {
    code: data.code as string,
    discountPercent: data.discount_percent,
    discountAmount: data.discount_amount,
  };
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

// A side-effect-free preview for the admin Quick Quote tool, which has no
// real customer attached — unlike redeemCouponCode, this never inserts a
// redemption row, so previewing a code here never burns/uses it. Only
// looks up shared code definitions (customer_id null); a customer's
// personal, already-issued coupon has no code to type in here anyway.
export async function lookupCouponCodeForQuote(
  code: string,
): Promise<RedeemCodeResult> {
  await requireAdmin();

  const normalized = code.trim().toUpperCase();
  if (!normalized) return { success: false, error: "Enter a code." };

  const supabase = createServiceClient();
  const { data: def } = await supabase
    .from("coupons")
    .select("discount_percent, discount_amount, expires_at")
    .is("customer_id", null)
    .eq("code", normalized)
    .maybeSingle();

  if (!def) return { success: false, error: "That code isn't valid." };

  if (def.expires_at && new Date(def.expires_at).getTime() < Date.now()) {
    return { success: false, error: "That code has expired." };
  }

  return {
    success: true,
    discountPercent: def.discount_percent,
    discountAmount: def.discount_amount,
  };
}
