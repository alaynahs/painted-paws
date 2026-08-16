import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import AdminBookingSearch from "@/components/admin-booking-search";

export default async function AdminBookPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-foreground">
          Book for a Customer
        </h1>
        <Link
          href="/admin/customers/new"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          + Add New Customer
        </Link>
      </div>
      <p className="mt-3 text-sm text-muted">
        Look up a customer by phone number, then pick which pet. You&apos;ll
        land on their profile, where you can book, view membership status,
        and see their notes and history.
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <div className="mt-8">
        <AdminBookingSearch />
      </div>
    </div>
  );
}
