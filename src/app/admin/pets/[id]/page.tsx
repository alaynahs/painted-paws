import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { updatePet } from "@/app/account/pets/actions";
import {
  deleteGroomPhoto,
  setCustomerDoNotBook,
  setPetActive,
  setPetDoNotBook,
  uploadGroomPhoto,
  uploadRabiesVaccineAdmin,
} from "@/app/admin/actions";
import { getNoShowCount } from "@/app/book/actions";
import { MAX_NO_SHOWS } from "@/lib/booking-hours";
import PetForm from "@/components/pet-form";
import PetPhoto from "@/components/pet-photo";
import CollapsibleCard from "@/components/collapsible-card";
import GroomingRecipeCard from "@/components/grooming-recipe-card";
import MembershipCard from "@/components/membership-card";
import ShowMoreList from "@/components/show-more-list";
import NoteForm from "@/components/note-form";
import NoteList from "@/components/note-list";
import PetAppointmentCard from "@/components/pet-appointment-card";
import { normalizeGroomRecipe } from "@/lib/groom-recipe";
import { centralDateOnly, formatDate, formatHour, todayInCentral } from "@/lib/format";
import {
  GROOM_PACK_SERVICE_LABELS,
  monthsSince,
  type GroomPackService,
} from "@/lib/pricing/pricing";

export default async function AdminPetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: pet } = await supabase
    .from("pets")
    .select("*, profiles:owner_id(full_name, phone, email, do_not_book)")
    .eq("id", id)
    .single();

  if (!pet) notFound();

  const togglePetActive = setPetActive.bind(null, pet.id, !pet.is_active);
  const toggleCustomerDoNotBook = setCustomerDoNotBook.bind(
    null,
    pet.owner_id,
    !pet.profiles?.do_not_book,
    pet.id,
  );
  const togglePetDoNotBook = setPetDoNotBook.bind(null, pet.id, !pet.do_not_book);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("pet_id", id)
    .order("appointment_date", { ascending: false })
    .order("appointment_hour", { ascending: false })
    .order("appointment_minute", { ascending: false });

  const { data: notes } = await supabase
    .from("groom_notes")
    .select("*")
    .eq("pet_id", id)
    .order("created_at", { ascending: false });

  let vaccineUrl: string | null = null;
  if (pet.rabies_vaccine_path) {
    const { data: signed } = await supabase.storage
      .from("vaccine-records")
      .createSignedUrl(pet.rabies_vaccine_path, 60 * 10);
    vaccineUrl = signed?.signedUrl ?? null;
  }

  let petPhotoUrl: string | null = null;
  if (pet.photo_path) {
    const { data: signed } = await supabase.storage
      .from("pet-photos")
      .createSignedUrl(pet.photo_path, 60 * 10);
    petPhotoUrl = signed?.signedUrl ?? null;
  }

  const isPuppyExempt =
    pet.species === "dog" &&
    !!pet.birth_date &&
    monthsSince(pet.birth_date) < 4;

  const noShowCount = await getNoShowCount(supabase, pet.owner_id);

  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("pet_id", id)
    .eq("status", "active")
    .maybeSingle();

  const { data: groomPacks } = await supabase
    .from("groom_credit_packs")
    .select("*")
    .eq("pet_id", id)
    .order("created_at", { ascending: false });

  const inspoUrls: Record<string, string> = {};
  await Promise.all(
    (appointments ?? [])
      .filter((a) => a.inspo_photo_path)
      .map(async (a) => {
        const { data: signed } = await supabase.storage
          .from("inspo-photos")
          .createSignedUrl(a.inspo_photo_path, 60 * 10);
        if (signed?.signedUrl) inspoUrls[a.id] = signed.signedUrl;
      }),
  );

  const { data: groomPhotos } = await supabase
    .from("groom_photos")
    .select("id, storage_path, caption, created_at")
    .eq("pet_id", id)
    .order("created_at", { ascending: false });

  const groomPhotoUrls = await Promise.all(
    (groomPhotos ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from("groom-photos")
        .createSignedUrl(p.storage_path, 60 * 10);
      return { ...p, url: signed?.signedUrl ?? null };
    }),
  );

  const noteUrls: Record<string, string> = {};
  await Promise.all(
    (notes ?? [])
      .filter((n) => n.photo_path)
      .map(async (n) => {
        const { data: signed } = await supabase.storage
          .from("groom-note-photos")
          .createSignedUrl(n.photo_path, 60 * 10);
        if (signed?.signedUrl) noteUrls[n.id] = signed.signedUrl;
      }),
  );

  const groomingNotes = (notes ?? []).filter((n) => n.note_type === "grooming");
  const behaviorNotes = (notes ?? []).filter((n) => n.note_type === "behavior");
  const parentNotes = (notes ?? []).filter((n) => n.note_type === "parent");

  const todayStr = todayInCentral();
  const isVaccineExpired =
    !!pet.rabies_expires_at && pet.rabies_expires_at < todayStr;
  const upcomingAppointments = (appointments ?? [])
    .filter((a) => a.appointment_date >= todayStr && a.status !== "cancelled")
    .sort((a, b) =>
      a.appointment_date === b.appointment_date
        ? a.appointment_hour * 60 +
          a.appointment_minute -
          (b.appointment_hour * 60 + b.appointment_minute)
        : a.appointment_date.localeCompare(b.appointment_date),
    );
  const pastAppointments = (appointments ?? []).filter(
    (a) => a.appointment_date < todayStr || a.status === "cancelled",
  );
  const todaysAppointment = upcomingAppointments.find(
    (a) => a.appointment_date === todayStr,
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PetPhoto
            petId={pet.id}
            photoUrl={petPhotoUrl}
            returnPath={`/admin/pets/${pet.id}`}
          />
          <h1 className="font-serif text-3xl text-foreground">{pet.name}</h1>
        </div>
        <Link
          href={`/admin/pets/${pet.id}/book`}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          + Book Appointment
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Owner: {pet.profiles?.full_name ?? "Unknown"}
        {pet.profiles?.phone ? ` · ${pet.profiles.phone}` : ""}
        {pet.profiles?.email ? ` · ${pet.profiles.email}` : ""}
      </p>
      {todaysAppointment && (
        <Link
          href={`/admin/appointments/${todaysAppointment.id}`}
          className="mt-3 flex items-center justify-between rounded-xl border border-accent-dark/40 bg-accent-tint px-4 py-2.5 text-sm text-foreground transition-colors hover:border-accent-dark"
        >
          <span>
            Today&apos;s appointment:{" "}
            <span className="font-medium">
              {formatHour(
                todaysAppointment.appointment_hour,
                todaysAppointment.appointment_minute,
              )}
            </span>
          </span>
          <span className="text-accent-dark">View visit →</span>
        </Link>
      )}
      {message && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {noShowCount > 0 && (
          <p
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              noShowCount >= MAX_NO_SHOWS
                ? "bg-accent text-white"
                : "bg-accent-tint text-accent-dark"
            }`}
          >
            {noShowCount} no-show{noShowCount === 1 ? "" : "s"}
            {noShowCount >= MAX_NO_SHOWS ? " (blocked from online booking)" : ""}
          </p>
        )}
        {!pet.is_active && (
          <p className="inline-block rounded-full bg-accent-tint px-3 py-1 text-xs font-medium text-accent-dark">
            Inactive
          </p>
        )}
        {pet.profiles?.do_not_book && (
          <p className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
            Customer blocked from booking
          </p>
        )}
        {pet.do_not_book && (
          <p className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
            This pet blocked from booking
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={togglePetActive}>
          <button
            type="submit"
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            {pet.is_active ? "Mark Pet Inactive" : "Mark Pet Active"}
          </button>
        </form>
        <form action={togglePetDoNotBook}>
          <button
            type="submit"
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            {pet.do_not_book
              ? "Allow This Pet to Book Again"
              : "Block This Pet From Booking"}
          </button>
        </form>
        <form action={toggleCustomerDoNotBook}>
          <button
            type="submit"
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            {pet.profiles?.do_not_book
              ? "Allow This Customer to Book Again"
              : "Block This Customer From Booking"}
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-serif text-lg text-foreground">
              Salon Pet Profile
            </h2>
            <div className="mt-4">
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
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <CollapsibleCard title="Grooming Notes" count={groomingNotes.length}>
              <NoteForm petId={pet.id} noteType="grooming" />
              <NoteList
                notes={groomingNotes}
                noteUrls={noteUrls}
                petId={pet.id}
                emptyLabel="No grooming notes yet."
              />
            </CollapsibleCard>

            <CollapsibleCard title="Behavior Notes" count={behaviorNotes.length}>
              <NoteForm petId={pet.id} noteType="behavior" />
              <NoteList
                notes={behaviorNotes}
                noteUrls={noteUrls}
                petId={pet.id}
                emptyLabel="No behavior notes yet."
              />
            </CollapsibleCard>
          </div>

          <CollapsibleCard
            title="Pet Parent / Service Notes"
            count={parentNotes.length}
          >
            <p className="mb-2 text-xs text-muted">
              Anything about the pet parent or how the service went — never
              shown to them, same as the notes above.
            </p>
            <NoteForm petId={pet.id} noteType="parent" />
            <NoteList
              notes={parentNotes}
              noteUrls={noteUrls}
              petId={pet.id}
              emptyLabel="No pet parent / service notes yet."
            />
          </CollapsibleCard>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
              Upcoming Appointments
            </h2>
            {upcomingAppointments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {upcomingAppointments.map((appt) => (
                  <PetAppointmentCard
                    key={appt.id}
                    appt={appt}
                    inspoUrl={inspoUrls[appt.id]}
                    showActions
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                No upcoming appointments.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
              Past Appointments
            </h2>
            {pastAppointments.length > 0 ? (
              <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                <ShowMoreList initialCount={3}>
                  {pastAppointments.map((appt) => (
                    <PetAppointmentCard
                      key={appt.id}
                      appt={appt}
                      inspoUrl={inspoUrls[appt.id]}
                    />
                  ))}
                </ShowMoreList>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No past appointments.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <GroomingRecipeCard
            petId={pet.id}
            recipe={normalizeGroomRecipe(pet.groom_recipe)}
          />

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
              Rabies Vaccine
            </h2>
            {isPuppyExempt ? (
              <p className="mt-2 text-sm text-muted">
                🐶 Exempt: under 4 months old.
              </p>
            ) : (
              <>
                {vaccineUrl && (
                  <a
                    href={vaccineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-accent-dark hover:underline"
                  >
                    View uploaded PDF
                    {pet.rabies_uploaded_at &&
                      ` (${formatDate(centralDateOnly(pet.rabies_uploaded_at))})`}
                  </a>
                )}
                {pet.rabies_expires_at && (
                  <p
                    className={`mt-1 text-xs ${isVaccineExpired ? "font-medium text-accent-dark" : "text-muted"}`}
                  >
                    {isVaccineExpired ? "Expired" : "Expires"}{" "}
                    {formatDate(pet.rabies_expires_at)}
                  </p>
                )}
                {!pet.rabies_vaccine_path && (
                  <p className="mt-2 text-sm text-muted">Not uploaded yet.</p>
                )}

                <form
                  action={uploadRabiesVaccineAdmin}
                  className="mt-3 space-y-2 border-t border-border pt-3"
                >
                  <input type="hidden" name="petId" value={pet.id} />
                  <div>
                    <label
                      className="text-xs font-medium text-foreground"
                      htmlFor="file"
                    >
                      Vaccine record (PDF){" "}
                      <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <input
                      id="file"
                      type="file"
                      name="file"
                      accept="application/pdf"
                      className="mt-1 block w-full text-xs text-foreground/80"
                    />
                  </div>
                  <div>
                    <label
                      className="text-xs font-medium text-foreground"
                      htmlFor="expiresAt"
                    >
                      Expiration date
                    </label>
                    <input
                      id="expiresAt"
                      type="date"
                      name="expiresAt"
                      required
                      className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-dark"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                  >
                    Upload
                  </button>
                </form>
              </>
            )}
          </section>

          <CollapsibleCard title="Groom Photos" count={groomPhotoUrls.length}>
            <p className="mb-2 text-xs text-muted">
              Visible to {pet.profiles?.full_name ?? "the pet parent"} on
              their account.
            </p>
            <form
              action={uploadGroomPhoto}
              className="space-y-2 border-b border-border pb-4"
            >
              <input type="hidden" name="petId" value={pet.id} />
              <input
                type="file"
                name="file"
                accept="image/*"
                required
                className="block w-full text-xs text-foreground/80"
              />
              <input
                type="text"
                name="caption"
                placeholder="Caption (optional)"
                className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-dark"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
              >
                + Upload Photo
              </button>
            </form>
            {groomPhotoUrls.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {groomPhotoUrls.map((photo) =>
                  photo.url ? (
                    <div key={photo.id} className="space-y-1">
                      <a href={photo.url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from private storage, not an optimizable static asset */}
                        <img
                          src={photo.url}
                          alt={photo.caption ?? "Groom photo"}
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                      </a>
                      {photo.caption && (
                        <p className="text-[10px] text-muted">{photo.caption}</p>
                      )}
                      <form action={deleteGroomPhoto.bind(null, photo.id, pet.id, undefined)}>
                        <button
                          type="submit"
                          className="text-[10px] text-muted hover:text-accent-dark"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">No groom photos yet.</p>
            )}
          </CollapsibleCard>

          <CollapsibleCard title="Membership" defaultOpen={!!membership}>
            {membership ? (
              <MembershipCard
                membership={{ ...membership, pets: { name: pet.name } }}
                showCancel={false}
              />
            ) : (
              <p className="text-sm text-muted">Not a member.</p>
            )}
          </CollapsibleCard>

          <CollapsibleCard
            title="Groom Packs"
            count={groomPacks?.length ?? 0}
            defaultOpen={!!groomPacks && groomPacks.length > 0}
          >
            {groomPacks && groomPacks.length > 0 ? (
              <div className="space-y-2">
                {groomPacks.map((pack) => {
                  const remaining =
                    pack.paid_count + pack.free_count - pack.credits_used;
                  return (
                    <div
                      key={pack.id}
                      className="rounded-xl border border-border bg-background p-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {
                            GROOM_PACK_SERVICE_LABELS[
                              pack.service as GroomPackService
                            ]
                          }
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                            pack.payment_status === "paid"
                              ? "bg-accent-tint text-accent-dark"
                              : "bg-background text-muted"
                          }`}
                        >
                          {pack.payment_status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {pack.payment_status === "paid"
                          ? `${remaining} of ${pack.paid_count + pack.free_count} credits remaining`
                          : "Awaiting payment confirmation"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Bought {formatDate(centralDateOnly(pack.created_at))} · $
                        {pack.total_price}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">No groom packs.</p>
            )}
          </CollapsibleCard>
        </aside>
      </div>
    </div>
  );
}
