import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePet, uploadRabiesVaccine } from "@/app/account/pets/actions";
import { deletePet } from "@/app/account/actions";
import PetForm from "@/components/pet-form";
import { formatDate } from "@/lib/format";
import { monthsSince } from "@/lib/pricing/pricing";

export default async function EditPetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", id)
    .single();

  if (!pet) notFound();

  const deletePetWithId = deletePet.bind(null, pet.id);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isPuppyExempt =
    pet.species === "dog" &&
    !!pet.birth_date &&
    monthsSince(pet.birth_date) < 4;
  const isExpired = !!pet.rabies_expires_at && pet.rabies_expires_at < todayStr;
  const needsUpload = !isPuppyExempt && (!pet.rabies_vaccine_path || isExpired);

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Pet profile
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Edit {pet.name}
      </h1>

      {saved && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          Saved.
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <div className="mt-8">
        <PetForm
          action={updatePet}
          submitLabel="Save Changes"
          defaultValues={{
            petId: pet.id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            coat: pet.coat,
            weightLb: pet.weight_lb,
            color: pet.color ?? "",
            healthConcerns: pet.health_concerns ?? "",
            birthDate: pet.birth_date ?? null,
          }}
        />
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          Rabies Vaccine Record
        </h2>

        {isPuppyExempt ? (
          <p className="mt-1 text-sm text-muted">
            🐶 Puppies under 4 months don&apos;t need a rabies vaccine on file
            yet — we&apos;ll ask for one once they&apos;re old enough.
          </p>
        ) : (
          <>
            {pet.rabies_vaccine_path && !isExpired && (
              <p className="mt-1 text-sm text-muted">
                Uploaded
                {pet.rabies_uploaded_at &&
                  ` ${formatDate(pet.rabies_uploaded_at.slice(0, 10))}`}
                {pet.rabies_expires_at &&
                  ` — expires ${formatDate(pet.rabies_expires_at)}`}
                .
              </p>
            )}
            {isExpired && (
              <p className="mt-1 text-sm text-foreground">
                Your on-file record expired
                {pet.rabies_expires_at && ` on ${formatDate(pet.rabies_expires_at)}`}
                — please upload an updated one below.
              </p>
            )}
            {!pet.rabies_vaccine_path && !isExpired && (
              <p className="mt-1 text-sm text-muted">
                Upload a PDF of your pet&apos;s current rabies vaccination
                record.
              </p>
            )}

            {needsUpload && (
              <form
                action={uploadRabiesVaccine}
                className="mt-4 flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="petId" value={pet.id} />
                <div>
                  <label
                    className="text-xs font-medium text-foreground"
                    htmlFor="file"
                  >
                    Vaccine record (PDF)
                  </label>
                  <input
                    id="file"
                    type="file"
                    name="file"
                    accept="application/pdf"
                    required
                    className="mt-1 block text-sm text-foreground/80"
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium text-foreground"
                    htmlFor="expiresAt"
                  >
                    Expiration date on the record
                  </label>
                  <input
                    id="expiresAt"
                    type="date"
                    name="expiresAt"
                    required
                    className="mt-1 block rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Upload
                </button>
              </form>
            )}
          </>
        )}
      </section>

      <form action={deletePetWithId} className="mt-6">
        <button
          type="submit"
          className="text-sm text-muted hover:text-foreground"
        >
          Remove this pet
        </button>
      </form>
    </div>
  );
}
