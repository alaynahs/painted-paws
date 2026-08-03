import { requireAdmin } from "@/lib/supabase/admin";
import AdminMembershipSearch from "@/components/admin-membership-search";
import MembershipCard from "@/components/membership-card";
import { getPricingConfig } from "@/lib/pricing/config";

export default async function AdminMembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error, created } = await searchParams;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*, pets(name), profiles:customer_id(full_name, phone)")
    .eq("status", "active")
    .order("started_at", { ascending: false });

  const config = await getPricingConfig();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Memberships
      </h1>

      {created && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          Membership set up.
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          Set Up a Membership
        </h2>
        <p className="mt-1 text-sm text-muted">
          Look up the customer by phone number, then pick their dog and a
          tier.
        </p>
        <div className="mt-4">
          <AdminMembershipSearch config={config} />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          Active Memberships
        </h2>
        {memberships && memberships.length > 0 ? (
          <div className="mt-4 space-y-3">
            {memberships.map((m) => (
              <div key={m.id}>
                <p className="text-xs text-muted">
                  {m.profiles?.full_name ?? "Unknown owner"}
                  {m.profiles?.phone ? ` · ${m.profiles.phone}` : ""}
                </p>
                <div className="mt-1">
                  <MembershipCard membership={m} showCancel={false} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No active memberships yet.</p>
        )}
      </section>
    </div>
  );
}
