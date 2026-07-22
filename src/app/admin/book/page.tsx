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
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Book for a Customer
      </h1>
      <p className="mt-3 text-sm text-muted">
        Look up a customer by phone number, then pick which pet — you&apos;ll
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
