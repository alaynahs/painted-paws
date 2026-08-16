"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

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

// Saves a card to the customer's Stripe Customer via a $0 "setup mode"
// Checkout Session — nothing is charged here. That saved card is what lets
// a later "pay for upcoming services" checkout skip re-entering card
// details (once Stripe's Checkout recognizes the returning customer).
export async function addPaymentMethod() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!stripe) {
    redirect(
      "/account?error=Online+payment+isn%27t+set+up+yet+%E2%80%94+please+check+back+later.",
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, full_name, email")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email ?? undefined,
      name: profile?.full_name ?? undefined,
      metadata: { supabaseUserId: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const origin = (await headers()).get("origin");
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: `${origin}/account?message=Payment+method+saved.`,
    cancel_url: `${origin}/account`,
  });

  if (!session.url) redirect("/account?error=Could%20not%20start%20checkout");
  redirect(session.url);
}

export async function deletePet(petId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pets").delete().eq("id", petId);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/account");
}
