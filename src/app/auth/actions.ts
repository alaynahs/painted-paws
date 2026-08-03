"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/account");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;
  const smsConsent = formData.get("smsConsent") === "on";

  if (!smsConsent) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Please agree to receive appointment texts to continue. That's how we send booking confirmations and reminders.",
      )}`,
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    // Uses the service client, not the request's own session — signUp()
    // hasn't necessarily produced a logged-in session yet (e.g. when email
    // confirmation is required), so RLS would otherwise silently block this.
    await createServiceClient()
      .from("profiles")
      .update({ sms_consent: true, sms_consent_at: new Date().toISOString() })
      .eq("id", data.user.id);
  }

  // If email confirmation is required, signUp succeeds but there's no
  // session yet — send them to log in once they've clicked the email link,
  // rather than bouncing them straight to /account with no explanation.
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Check your email to confirm your account, then log in.",
      )}`,
    );
  }

  redirect("/account");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(
        error?.message ?? "Could not start Google sign-in.",
      )}`,
    );
  }
  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const origin = (await headers()).get("origin");

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  });

  // Always show the same message, whether or not that email has an
  // account — don't let this form reveal which emails are registered.
  redirect(
    `/forgot-password?message=${encodeURIComponent(
      "If an account exists for that email, a reset link is on its way.",
    )}`,
  );
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Passwords don't match.")}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "Password updated. Log in with your new password.",
    )}`,
  );
}

// Same underlying Supabase call as updatePassword above, but for a customer
// changing their password from their own account page (already logged in) —
// so it stays on /account with a message instead of bouncing to /login.
export async function updatePasswordFromAccount(formData: FormData) {
  const supabase = await createClient();
  const currentPassword = formData.get("currentPassword") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { error: currentPasswordError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (currentPasswordError) {
    redirect(
      `/account?error=${encodeURIComponent("Current password is incorrect.")}`,
    );
  }

  if (password !== confirmPassword) {
    redirect(`/account?error=${encodeURIComponent("Passwords don't match.")}`);
  }
  if (password.length < 6) {
    redirect(
      `/account?error=${encodeURIComponent("Password must be at least 6 characters.")}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/account?message=${encodeURIComponent("Password updated.")}`);
}
