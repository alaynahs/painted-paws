import { updatePassword } from "@/app/auth/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <p className="text-center text-sm font-medium tracking-wide text-accent-dark uppercase">
        Reset password
      </p>
      <h1 className="mt-3 text-center font-serif text-3xl text-foreground">
        Set a New Password
      </h1>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <form action={updatePassword} className="mt-8 space-y-4">
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="password"
          >
            New password
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
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="confirmPassword"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}
