import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, do_not_book")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, species, breed")
    .eq("owner_id", id)
    .order("created_at", { ascending: true });

  const { data: coupons } = await supabase
    .from("coupons")
    .select("id, discount_percent, discount_amount, note, used_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin · Customer
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {profile.full_name ?? "Unknown"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {profile.phone}
        {profile.phone && profile.email ? " · " : ""}
        {profile.email}
      </p>
      {profile.do_not_book && (
        <p className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
          Blocked from booking
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">Pets</h2>
          <Link
            href={`/admin/pets/new?customerId=${profile.id}`}
            className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
          >
            + Add a Pet
          </Link>
        </div>
        {pets && pets.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/admin/pets/${pet.id}`}
                className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent-dark"
              >
                <p className="font-serif text-base text-foreground">
                  {pet.name}
                </p>
                <p className="mt-1 text-xs text-muted">{pet.breed}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No pets saved for this customer yet.
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">Coupons</h2>
        {coupons && coupons.length > 0 ? (
          <div className="mt-4 space-y-3">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-serif text-base text-foreground">
                    {c.discount_percent != null
                      ? `${c.discount_percent}% off`
                      : `$${c.discount_amount} off`}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      c.used_at
                        ? "bg-border text-muted"
                        : "bg-accent-tint text-accent-dark"
                    }`}
                  >
                    {c.used_at ? "Used" : "Available"}
                  </span>
                </div>
                {c.note && (
                  <p className="mt-1 text-xs text-muted">{c.note}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No coupons on this account.
          </p>
        )}
      </section>
    </div>
  );
}
