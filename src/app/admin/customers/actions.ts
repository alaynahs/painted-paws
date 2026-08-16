"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceClient } from "@/lib/supabase/service";

// Most of the app reads contact info from profiles.email/phone, not
// auth.users directly, so both need updating — with the service-role
// client for both. auth.users needs it because changing another person's
// login email requires admin privileges; profiles needs it because its
// RLS policy only allows updating your *own* row (auth.uid() = id), with
// no admin-bypass rule for writes (only for reads) — the admin's own
// session client silently updates zero rows there, no error thrown.
export async function adminUpdateCustomerContact(
  customerId: string,
  formData: FormData,
) {
  await requireAdmin();
  const email = ((formData.get("email") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const editPath = `/admin/customers/${customerId}`;

  if (!email || !phone) {
    redirect(`${editPath}?error=${encodeURIComponent("Email and phone are both required.")}`);
  }

  const serviceClient = createServiceClient();

  // email_confirm: true skips Supabase's confirm-from-the-new-address flow —
  // the admin is directly asserting this contact info is correct, so it
  // should take effect immediately rather than sit pending confirmation.
  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    customerId,
    { email, email_confirm: true },
  );
  if (authError) {
    redirect(`${editPath}?error=${encodeURIComponent(authError.message)}`);
  }

  const { error: profileError } = await serviceClient
    .from("profiles")
    .update({ email, phone })
    .eq("id", customerId);
  if (profileError) {
    redirect(`${editPath}?error=${encodeURIComponent(profileError.message)}`);
  }

  revalidatePath(editPath);
  redirect(`${editPath}?message=${encodeURIComponent("Contact info updated.")}`);
}

// Every profile is otherwise created only through real self-signup
// (profiles.id references auth.users, so there's no way to insert one
// directly) — this lets the admin create a real login-capable account for
// a walk-in/phone customer who's never signed up themselves. No password
// is set; they can use "forgot password" later if they ever want to log in
// and manage their own account, same as any admin-created user.
export async function adminCreateCustomer(formData: FormData) {
  await requireAdmin();
  const fullName = ((formData.get("fullName") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();

  if (!fullName || !email) {
    redirect(
      `/admin/customers/new?error=${encodeURIComponent("Name and email are both required.")}`,
    );
  }

  const serviceClient = createServiceClient();

  // The handle_new_user trigger creates the matching profiles row
  // automatically from auth.users + user_metadata, same as real signup.
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (error || !data.user) {
    redirect(
      `/admin/customers/new?error=${encodeURIComponent(error?.message ?? "Could not create customer.")}`,
    );
  }

  redirect(`/admin/pets/new?customerId=${data.user.id}`);
}
