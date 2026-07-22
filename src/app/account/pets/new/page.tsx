import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPet } from "@/app/account/pets/actions";
import PetForm from "@/components/pet-form";

export default async function NewPetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Pet profile
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Add a Pet
      </h1>
      <p className="mt-3 text-sm text-muted">
        Save your pet&apos;s info once — you&apos;ll just pick them by name
        every time you book.
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <div className="mt-8">
        <PetForm action={createPet} submitLabel="Add Pet" />
      </div>
    </div>
  );
}
