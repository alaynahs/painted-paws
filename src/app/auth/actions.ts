"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const identifier = ((formData.get("email") as string) || "").trim();
  const password = formData.get("password") as string;

  // Supabase Auth identities here are all email-based (see signup below) —
  // phone is just a profiles column, not a verified auth identity — so a
  // phone-number login resolves to that profile's real email first, then
  // signs in with that, same as if they'd typed the email directly.
  let email = identifier;
  if (!identifier.includes("@")) {
    const digits = identifier.replace(/\D/g, "");
    if (!digits) {
      redirect(
        `/login?error=${encodeURIComponent("Enter your email or phone number.")}`,
      );
    }

    const { data: withPhone } = await createServiceClient()
      .from("profiles")
      .select("email, phone")
      .not("phone", "is", null);
    const match = (withPhone ?? []).find(
      (p) => p.phone?.replace(/\D/g, "") === digits,
    );

    if (!match || !match.email) {
      redirect(
        `/login?error=${encodeURIComponent(
          "We couldn't find an account with that phone number.",
        )}`,
      );
    }
    email = match.email;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/account");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const phone = (formData.get("phone") as string).trim();
  const smsConsent = formData.get("smsConsent") === "on";
  const origin = (await headers()).get("origin");

  // Someone the admin already created an account for (e.g. a walk-in
  // booked by phone) shouldn't hit a dead-end signing up with the same
  // email or phone — recognize the existing account and send them into the
  // same "set a password" flow as Forgot Password, instead of erroring or
  // creating a duplicate profile with no pet history attached.
  const serviceClient = createServiceClient();
  const phoneDigits = phone.replace(/\D/g, "");
  const { data: emailMatch } = await serviceClient
    .from("profiles")
    .select("email")
    .ilike("email", email)
    .maybeSingle();
  let existingEmail = emailMatch?.email ?? null;

  if (!existingEmail && phoneDigits) {
    const { data: withPhone } = await serviceClient
      .from("profiles")
      .select("email, phone")
      .not("phone", "is", null);
    existingEmail =
      (withPhone ?? []).find((p) => p.phone?.replace(/\D/g, "") === phoneDigits)
        ?.email ?? null;
  }

  if (existingEmail) {
    await supabase.auth.resetPasswordForEmail(existingEmail, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    });
    redirect(
      `/login?message=${encodeURIComponent(
        `We found an existing account for you — check ${existingEmail} for a link to set your password and log in.`,
      )}`,
    );
  }

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
      .update({
        sms_consent: true,
        sms_consent_at: new Date().toISOString(),
        password_set: true,
      })
      .eq("id", data.user.id);
  }

  // Requires "Confirm email" to be turned off in Supabase (Authentication >
  // Providers > Email) — otherwise signUp() has no session yet and this
  // falls back to sending them to log in once they've clicked the email link.
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Check your email to confirm your account, then log in.",
      )}`,
    );
  }

  redirect("/account/pets/new");
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

// Powers the "Haven't created a password yet?" prompt right on the login
// page — for a customer whose account the admin created by phone, so they
// were never actually handed a password. Unlike requestPasswordReset above,
// this deliberately *does* say whether an account exists and already has a
// password, since the point is to tell someone "you're already set up, just
// log in" instead of quietly emailing a redundant link.
export async function checkPasswordStatus(formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim();
  const origin = (await headers()).get("origin");

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("email, password_set")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    redirect(
      `/login?error=${encodeURIComponent(
        "We don't have an account with that email yet — sign up instead.",
      )}`,
    );
  }

  if (profile.password_set) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Looks like you already have a password set for this account — log in above, or use Forgot Password if you don't remember it.",
      )}`,
    );
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  });

  redirect(
    `/login?message=${encodeURIComponent(
      `We found your account — check ${profile.email} for a link to create your password.`,
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

  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await supabase
      .from("profiles")
      .update({ password_set: true })
      .eq("id", data.user.id);
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

  await supabase
    .from("profiles")
    .update({ password_set: true })
    .eq("id", user.id);

  redirect(`/account?message=${encodeURIComponent("Password updated.")}`);
}
