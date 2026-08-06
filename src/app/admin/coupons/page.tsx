import { requireAdmin } from "@/lib/supabase/admin";
import AdminCouponSearch from "@/components/admin-coupon-search";
import AdminCouponGroup from "@/components/admin-coupon-group";

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

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="font-serif text-lg text-foreground">Give to a Group</h2>
        <p className="mt-1 text-sm text-muted">
          Pick a segment (e.g. signed up but never booked, or haven&apos;t
          booked in a while) and give everyone in it the same coupon at
          once.
        </p>
        <div className="mt-4">
          <AdminCouponGroup />
        </div>
      </div>
    </div>
  );
}
