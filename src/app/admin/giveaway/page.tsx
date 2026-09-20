import { requireAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";

export default async function AdminGiveawayPage() {
  const { supabase } = await requireAdmin();

  const { data: entries } = await supabase
    .from("giveaway_entries")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = entries ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Giveaway Entries
      </h1>
      <p className="mt-3 text-sm text-muted">
        Entries submitted through the public{" "}
        <span className="font-medium text-foreground/90">/giveaway</span>{" "}
        form.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-4xl font-serif text-accent-dark">{rows.length}</p>
        <p className="mt-1 text-sm text-muted">
          Total {rows.length === 1 ? "entry" : "entries"} so far
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Pet</th>
                <th className="px-4 py-3 font-medium">Breed</th>
                <th className="px-4 py-3 font-medium">Zip</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Promo Emails</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{row.full_name}</td>
                  <td className="px-4 py-3 text-foreground">{row.pet_name}</td>
                  <td className="px-4 py-3 text-foreground">{row.breed}</td>
                  <td className="px-4 py-3 text-foreground">{row.zip_code}</td>
                  <td className="px-4 py-3 text-foreground">{row.phone}</td>
                  <td className="px-4 py-3 text-foreground">{row.email}</td>
                  <td className="px-4 py-3 text-foreground">
                    {row.promo_opt_out ? "No" : "Yes"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatDate(row.created_at.slice(0, 10))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">No entries yet.</p>
      )}
    </div>
  );
}
