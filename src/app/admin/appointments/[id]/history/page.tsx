import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import AppointmentHistoryList from "@/components/appointment-history-list";

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

      <div className="mt-6">
        <AppointmentHistoryList history={history ?? []} />
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
