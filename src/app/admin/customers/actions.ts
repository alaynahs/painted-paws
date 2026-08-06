"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceClient } from "@/lib/supabase/service";

// Most of the app reads contact info from profiles.email/phone, not
// auth.users directly, so both need updating — auth.users via the
// service-role admin API (this changes another person's login email,
// which requires admin privileges), profiles via a normal update.
export async function adminUpdateCustomerContact(
  customerId: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();
  const email = ((formData.get("email") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const editPath = `/admin/customers/${customerId}`;

  if (!email || !phone) {
    redirect(`${editPath}?error=${encodeURIComponent("Email and phone are both required.")}`);
  }

  const { error: authError } = await createServiceClient().auth.admin.updateUserById(
    customerId,
    { email },
  );
  if (authError) {
    redirect(`${editPath}?error=${encodeURIComponent(authError.message)}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ email, phone })
    .eq("id", customerId);
  if (profileError) {
    redirect(`${editPath}?error=${encodeURIComponent(profileError.message)}`);
  }

  redirect(`${editPath}?message=${encodeURIComponent("Contact info updated.")}`);
}
