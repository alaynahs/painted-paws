"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { isGiveawayActive } from "@/lib/giveaway";

// Public entry form, no login required — uses the service client since
// there's no customer session to attach an RLS-friendly owner id to.
export async function submitGiveawayEntry(formData: FormData) {
  if (!isGiveawayActive()) redirect("/giveaway");

  const fullName = ((formData.get("fullName") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const petName = ((formData.get("petName") as string) || "").trim();
  const breed = ((formData.get("breed") as string) || "").trim();
  const zipCode = ((formData.get("zipCode") as string) || "").trim();
  const promoOptOut = formData.get("promoOptOut") === "on";

  if (!fullName || !email || !phone || !petName || !breed || !zipCode) {
    redirect(
      `/giveaway?error=${encodeURIComponent("Please fill in every field to enter.")}`,
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("giveaway_entries").insert({
    full_name: fullName,
    email,
    phone,
    pet_name: petName,
    breed,
    zip_code: zipCode,
    promo_opt_out: promoOptOut,
  });

  if (error) {
    redirect(
      `/giveaway?error=${encodeURIComponent("Something went wrong submitting your entry — please try again.")}`,
    );
  }

  redirect("/giveaway?entered=1");
}
