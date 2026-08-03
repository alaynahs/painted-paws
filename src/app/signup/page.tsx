import Link from "next/link";
import { signup } from "@/app/auth/actions";
import GoogleSignInButton from "@/components/google-signin-button";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <p className="text-center text-sm font-medium tracking-wide text-accent-dark uppercase">
        New here?
      </p>
      <h1 className="mt-3 text-center font-serif text-3xl text-foreground">
        Create an Account
      </h1>
      <p className="mt-3 text-center text-sm text-muted">
        Set up your account once, then add your pet&apos;s info. You&apos;ll
        pick from your saved pets every time you book.
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <div className="mt-8">
        <GoogleSignInButton />
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        Signing up with Google skips straight to your account — just add your
        phone number there so we can text booking updates.
      </p>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or sign up with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signup} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="fullName">
            Your name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="phone">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <label className="flex items-start gap-2 text-xs text-muted">
          <input
            type="checkbox"
            name="smsConsent"
            required
            className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
          />
          I agree to receive appointment texts (confirmations, reminders,
          pickup updates) at the phone number above. Msg &amp; data rates may
          apply. Reply STOP to opt out. See our{" "}
          <Link href="/privacy" className="text-accent-dark hover:underline">
            Privacy Policy
          </Link>
          .
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Create Account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-dark hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
