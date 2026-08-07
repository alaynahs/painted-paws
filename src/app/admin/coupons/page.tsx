import { requireAdmin } from "@/lib/supabase/admin";
import AdminCouponSearch from "@/components/admin-coupon-search";
import AdminCouponGroup from "@/components/admin-coupon-group";
import CouponDiscountInputs from "@/components/coupon-discount-inputs";
import { generateCouponCode, deleteCouponCode } from "./actions";
import { formatDate, formatDateTime } from "@/lib/format";

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error, message } = await searchParams;

  const [{ data: codes }, { data: redemptions }] = await Promise.all([
    supabase
      .from("coupons")
      .select(
        "id, code, discount_percent, discount_amount, note, max_redemptions, expires_at, created_at",
      )
      .is("customer_id", null)
      .order("created_at", { ascending: false }),
    supabase.from("coupons").select("source_code_id").not("source_code_id", "is", null),
  ]);

  const redemptionCounts = new Map<string, number>();
  for (const r of redemptions ?? []) {
    if (!r.source_code_id) continue;
    redemptionCounts.set(r.source_code_id, (redemptionCounts.get(r.source_code_id) ?? 0) + 1);
  }

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

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="font-serif text-lg text-foreground">Coupon Codes</h2>
        <p className="mt-1 text-sm text-muted">
          Generate a shareable code (for social media, flyers, etc.) that
          any customer can type in at checkout. Leave the code field blank
          to auto-generate one.
        </p>
        <form
          action={generateCouponCode}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            name="code"
            placeholder="Code (optional)"
            maxLength={20}
            className="w-36 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground uppercase outline-none focus:border-accent-dark"
          />
          <CouponDiscountInputs />
          <input
            type="number"
            name="maxRedemptions"
            min={1}
            step={1}
            placeholder="Max uses (optional)"
            className="w-36 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
          />
          <input
            type="date"
            name="expiresAt"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Generate Code
          </button>
        </form>

        {codes && codes.length > 0 ? (
          <div className="mt-6 space-y-2">
            {codes.map((c) => {
              const used = redemptionCounts.get(c.id) ?? 0;
              const expired = !!c.expires_at && new Date(c.expires_at) < new Date();
              const capped = c.max_redemptions != null && used >= c.max_redemptions;
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <div>
                    <p className="font-mono text-sm font-medium text-foreground">
                      {c.code}
                      {(expired || capped) && (
                        <span className="ml-2 rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-dark">
                          {expired ? "Expired" : "Limit reached"}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {c.discount_percent != null
                        ? `${c.discount_percent}% off`
                        : `$${c.discount_amount} off`}
                      {" · "}
                      {used} use{used === 1 ? "" : "s"}
                      {c.max_redemptions != null ? ` of ${c.max_redemptions}` : ""}
                      {c.expires_at ? ` · expires ${formatDate(c.expires_at.slice(0, 10))}` : ""}
                      {c.note ? ` · ${c.note}` : ""}
                      {" · created "}
                      {formatDateTime(c.created_at)}
                    </p>
                  </div>
                  <form action={deleteCouponCode.bind(null, c.id)}>
                    <button
                      type="submit"
                      className="text-xs text-muted hover:text-accent-dark"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No codes created yet.</p>
        )}
      </div>
    </div>
  );
}
