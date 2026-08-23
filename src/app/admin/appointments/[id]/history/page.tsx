import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

const ACTION_LABELS: Record<string, string> = {
  booked: "Booked",
  edited: "Edited",
  cancelled: "Cancelled",
  confirmed: "Confirmed",
  completed: "Marked complete",
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AppointmentHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, pets(name)")
    .eq("id", id)
    .single();

  if (!appointment) notFound();
  const pet = Array.isArray(appointment.pets) ? appointment.pets[0] : appointment.pets;

  const { data: history } = await supabase
    .from("appointment_history")
    .select("id, action, actor_type, note, created_at, profiles:actor_id(full_name)")
    .eq("appointment_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin · Appointment History
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {pet?.name ?? "Pet"}&apos;s Appointment
      </h1>

      <div className="mt-6 space-y-3">
        {(history ?? []).length > 0 ? (
          (history ?? []).map((h) => {
            const profile = Array.isArray(h.profiles) ? h.profiles[0] : h.profiles;
            const who =
              h.actor_type === "admin"
                ? "You"
                : h.actor_type === "system"
                  ? "System"
                  : (profile?.full_name ?? "Pet parent");
            return (
              <div
                key={h.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {ACTION_LABELS[h.action] ?? h.action}
                  </p>
                  <p className="text-xs text-muted">{formatTimestamp(h.created_at)}</p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  By {who}
                  {h.note ? ` · ${h.note}` : ""}
                </p>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted">No history recorded yet.</p>
        )}
      </div>

      <Link
        href={`/admin/appointments/${id}`}
        className="mt-8 inline-block text-sm text-muted hover:text-accent-dark"
      >
        ← Back to appointment
      </Link>
    </div>
  );
}
