import Link from "next/link";
import { login } from "@/app/auth/actions";
import GoogleSignInButton from "@/components/google-signin-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <p className="text-center text-sm font-medium tracking-wide text-accent-dark uppercase">
        Welcome back
      </p>
      <h1 className="mt-3 text-center font-serif text-3xl text-foreground">
        Log In
      </h1>

      {message && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <div className="mt-8">
        <GoogleSignInButton />
      </div>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or log in with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={login} className="mt-6 space-y-4">
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
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Log In
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="text-accent-dark hover:underline">
          Forgot your password?
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="text-accent-dark hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
