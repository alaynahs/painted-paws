"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

export async function createCoupon(customerId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const discountPercent = Number(formData.get("discountPercent"));
  const note = (formData.get("note") as string) || null;

  if (!discountPercent || discountPercent <= 0) {
    redirect(
      `/admin/coupons?error=${encodeURIComponent("Enter a discount percentage greater than 0.")}`,
    );
  }

  await supabase.from("coupons").insert({
    customer_id: customerId,
    discount_percent: discountPercent,
    note,
  });

  redirect(`/admin/coupons?message=${encodeURIComponent("Coupon added.")}`);
}
