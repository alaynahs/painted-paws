import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <p className="text-center text-sm font-medium tracking-wide text-accent-dark uppercase">
        Reset password
      </p>
      <h1 className="mt-3 text-center font-serif text-3xl text-foreground">
        Forgot your password?
      </h1>
      <p className="mt-3 text-center text-sm text-muted">
        Enter the email on your account and we&apos;ll send you a link to
        set a new password.
      </p>

      {message && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}

      <form action={requestPasswordReset} className="mt-8 space-y-4">
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
        <button
          type="submit"
          className="w-full rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Send Reset Link
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="text-accent-dark hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
