import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { adminCreatePet } from "@/app/account/pets/actions";
import PetForm from "@/components/pet-form";

export default async function AdminNewPetPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; error?: string }>;
}) {
  const { customerId, error } = await searchParams;
  const { supabase } = await requireAdmin();

  if (!customerId) notFound();

  const { data: customer } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email")
    .eq("id", customerId)
    .single();

  if (!customer) notFound();

  const createForCustomer = adminCreatePet.bind(null, customerId);

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin · Add Pet
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Add a Pet for {customer.full_name ?? "This Customer"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {customer.phone}
        {customer.phone && customer.email ? " · " : ""}
        {customer.email}
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <div className="mt-8">
        <PetForm action={createForCustomer} submitLabel="Add Pet" />
      </div>
    </div>
  );
}
