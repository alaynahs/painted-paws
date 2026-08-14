"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin";

function revalidateEverywhere() {
  revalidatePath("/admin/pricing");
  revalidatePath("/book");
  revalidatePath("/");
}

function readPromotionFields(formData: FormData) {
  const maxUsesRaw = (formData.get("maxUses") as string)?.trim();
  const leadDaysRaw = (formData.get("maxAppointmentLeadDays") as string)?.trim();
  return {
    name: ((formData.get("name") as string) || "").trim(),
    discountPercent: Number(formData.get("discountPercent")),
    maxUses: maxUsesRaw ? Number(maxUsesRaw) : null,
    startsAt: formData.get("startsAt") as string,
    endsAt: formData.get("endsAt") as string,
    maxAppointmentLeadDays: leadDaysRaw ? Number(leadDaysRaw) : null,
    bannerMessage: ((formData.get("bannerMessage") as string) || "").trim() || null,
  };
}

export async function createPromotion(formData: FormData) {
  const { supabase } = await requireAdmin();
  const fields = readPromotionFields(formData);

  if (!fields.name || !fields.startsAt || !fields.endsAt || !Number.isFinite(fields.discountPercent)) {
    redirect("/admin/pricing?error=Please+fill+out+the+promotion+form.");
  }

  await supabase.from("promotions").insert({
    name: fields.name,
    discount_percent: fields.discountPercent,
    max_uses: fields.maxUses,
    starts_at: new Date(fields.startsAt).toISOString(),
    ends_at: new Date(fields.endsAt).toISOString(),
    max_appointment_lead_days: fields.maxAppointmentLeadDays,
    banner_message: fields.bannerMessage,
    active: true,
  });

  revalidateEverywhere();
  redirect("/admin/pricing?saved=promotion-created");
}

export async function updatePromotion(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id") as string;
  const fields = readPromotionFields(formData);
  const active = formData.get("active") === "true";

  await supabase
    .from("promotions")
    .update({
      name: fields.name,
      discount_percent: fields.discountPercent,
      max_uses: fields.maxUses,
      starts_at: new Date(fields.startsAt).toISOString(),
      ends_at: new Date(fields.endsAt).toISOString(),
      max_appointment_lead_days: fields.maxAppointmentLeadDays,
      banner_message: fields.bannerMessage,
      active,
    })
    .eq("id", id);

  revalidateEverywhere();
  redirect("/admin/pricing?saved=promotion-updated");
}

export async function deletePromotion(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id") as string;
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  revalidateEverywhere();
  if (error) {
    redirect(`/admin/pricing?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/admin/pricing?saved=promotion-deleted");
}

// "Remaining" isn't stored directly — it's max_uses minus real usage, so
// "resetting" it just raises max_uses by however many bookings have
// already used this promo, without touching any booking history.
export async function resetPromotionRemaining(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id") as string;
  const desiredRemaining = Number(formData.get("remaining"));

  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("promo_id", id);

  await supabase
    .from("promotions")
    .update({ max_uses: (count ?? 0) + desiredRemaining })
    .eq("id", id);

  revalidateEverywhere();
  redirect("/admin/pricing?saved=promotion-reset");
}
