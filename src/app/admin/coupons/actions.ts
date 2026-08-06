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

export type CustomerGroup =
  | "never_booked"
  | "no_visit_8wk"
  | "no_visit_12wk"
  | "no_visit_16wk";

export interface GroupMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

const GROUP_WEEKS: Partial<Record<CustomerGroup, number>> = {
  no_visit_8wk: 8,
  no_visit_12wk: 12,
  no_visit_16wk: 16,
};

function daysAgo(dateStr: string, todayStr: string): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Math.round(
    (new Date(`${todayStr}T00:00:00Z`).getTime() -
      new Date(`${dateStr}T00:00:00Z`).getTime()) /
      DAY_MS,
  );
}

// Finds every customer matching a plain-language segment — "never booked"
// or "hasn't booked in N+ weeks" — so the admin can hand a group coupon to
// everyone in it at once instead of searching one at a time.
export async function getCustomersByGroup(
  group: CustomerGroup,
): Promise<GroupMember[]> {
  const { supabase } = await requireAdmin();

  const [{ data: profiles }, { data: appts }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "customer"),
    supabase.from("appointments").select("customer_id, appointment_date, status"),
  ]);

  const byCustomer = new Map<string, { date: string; status: string }[]>();
  for (const a of appts ?? []) {
    const list = byCustomer.get(a.customer_id) ?? [];
    list.push({ date: a.appointment_date, status: a.status });
    byCustomer.set(a.customer_id, list);
  }

  const today = new Date().toISOString().slice(0, 10);
  const weeks = GROUP_WEEKS[group];

  const matches: GroupMember[] = [];
  for (const profile of profiles ?? []) {
    const history = byCustomer.get(profile.id) ?? [];

    if (group === "never_booked") {
      if (history.length === 0) matches.push(profile);
      continue;
    }

    const hasUpcoming = history.some(
      (a) => a.date >= today && a.status !== "cancelled",
    );
    if (hasUpcoming) continue;

    const pastDates = history
      .filter((a) => a.date < today && a.status !== "cancelled")
      .map((a) => a.date)
      .sort();
    const lastDate = pastDates[pastDates.length - 1];
    if (!lastDate || !weeks) continue;

    if (daysAgo(lastDate, today) >= weeks * 7) matches.push(profile);
  }

  return matches;
}

export async function createCouponsForGroup(formData: FormData) {
  const { supabase } = await requireAdmin();
  const group = formData.get("group") as CustomerGroup;
  const discountPercent = Number(formData.get("discountPercent"));
  const note = (formData.get("note") as string) || null;

  if (!discountPercent || discountPercent <= 0) {
    redirect(
      `/admin/coupons?error=${encodeURIComponent("Enter a discount percentage greater than 0.")}`,
    );
  }

  const members = await getCustomersByGroup(group);
  if (members.length === 0) {
    redirect(
      `/admin/coupons?message=${encodeURIComponent("No customers currently match that group.")}`,
    );
  }

  await supabase.from("coupons").insert(
    members.map((m) => ({
      customer_id: m.id,
      discount_percent: discountPercent,
      note,
    })),
  );

  redirect(
    `/admin/coupons?message=${encodeURIComponent(`Coupon given to ${members.length} customer${members.length === 1 ? "" : "s"}.`)}`,
  );
}
