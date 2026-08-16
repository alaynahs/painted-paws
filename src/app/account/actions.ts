"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;

  // Upsert (not update) — guarantees the profile row exists even if the
  // signup trigger didn't create it, instead of silently updating zero rows.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: fullName, phone });

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/account?saved=1");
}

export async function updateEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }
  redirect(
    "/account?message=Check+your+new+email+to+confirm+the+change.",
  );
}

export async function deletePet(petId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pets").delete().eq("id", petId);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/account");
}
