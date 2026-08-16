import { requireAdmin } from "@/lib/supabase/admin";
import { adminCreateCustomer } from "../actions";

export default async function AdminNewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; phone?: string; name?: string }>;
}) {
  await requireAdmin();
  const { error, phone, name } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin · New Customer
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Add a New Customer
      </h1>
      <p className="mt-2 text-sm text-muted">
        For a walk-in or phone booking who&apos;s never signed up
        themselves. An email is required to create their account — they can
        set a password later (via &quot;Forgot password&quot;) if they ever
        want to log in and manage it themselves.
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <form action={adminCreateCustomer} className="mt-8 space-y-5">
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            defaultValue={name}
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
          <label className="text-sm font-medium text-foreground" htmlFor="phone">
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={phone}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Create Customer & Add a Pet
        </button>
      </form>
    </div>
  );
}
