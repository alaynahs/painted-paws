"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

function readBundle(formData: FormData) {
  const bundle = (formData.get("addonBundle") as string) || "none";
  return bundle === "none" ? null : bundle;
}

export async function joinMembership(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const petId = formData.get("petId") as string;
  const tier = formData.get("tier") as string;
  const paymentMethod = (formData.get("paymentMethod") as string) || "in_person";

  const { error } = await supabase.from("memberships").insert({
    customer_id: user.id,
    pet_id: petId,
    tier,
    addon_bundle: readBundle(formData),
    payment_method: paymentMethod,
  });

  if (error) {
    redirect(`/membership?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/membership?joined=1");
}

export async function cancelMembership(membershipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("memberships")
    .update({ status: "cancelled" })
    .eq("id", membershipId)
    .eq("customer_id", user.id);

  redirect("/membership?message=Membership+cancelled.");
}

export async function adminCreateMembership(formData: FormData) {
  const { supabase } = await requireAdmin();

  const customerId = formData.get("customerId") as string;
  const petId = formData.get("petId") as string;
  const tier = formData.get("tier") as string;
  const paymentMethod = (formData.get("paymentMethod") as string) || "in_person";

  const { error } = await supabase.from("memberships").insert({
    customer_id: customerId,
    pet_id: petId,
    tier,
    addon_bundle: readBundle(formData),
    payment_method: paymentMethod,
  });

  if (error) {
    redirect(`/admin/memberships?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/admin/memberships?created=1");
}
