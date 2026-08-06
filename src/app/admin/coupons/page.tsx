import { requireAdmin } from "@/lib/supabase/admin";
import AdminCouponSearch from "@/components/admin-coupon-search";

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  await requireAdmin();
  const { error, message } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">Coupons</h1>
      <p className="mt-3 text-sm text-muted">
        Look up a customer and give them a personal discount. It applies
        automatically the next time they book online, then can&apos;t be
        used again.
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}

      <div className="mt-8">
        <AdminCouponSearch />
      </div>
    </div>
  );
}
