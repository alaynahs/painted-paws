import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { updatePet } from "@/app/account/pets/actions";
import {
  addGroomNote,
  deleteGroomPhoto,
  markAppointmentComplete,
  setCustomerDoNotBook,
  setPetActive,
  setPetDoNotBook,
  uploadGroomPhoto,
} from "@/app/admin/actions";
import { confirmAppointment, getNoShowCount } from "@/app/book/actions";
import { MAX_NO_SHOWS } from "@/lib/booking-hours";
import PetForm from "@/components/pet-form";
import MembershipCard from "@/components/membership-card";
import CancelAppointmentButton from "@/components/cancel-appointment-button";
import ShowMoreList from "@/components/show-more-list";
import { centralDateOnly, formatDate, formatHour, todayInCentral } from "@/lib/format";
import {
  formatServiceLabel,
  GROOM_PACK_SERVICE_LABELS,
  monthsSince,
  type GroomPackService,
} from "@/lib/pricing/pricing";

export default async function AdminPetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
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
    .order("appointment_hour", { ascending: false });

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

  const groomingNotes = (notes ?? []).filter((n) => n.note_type === "grooming");
  const behaviorNotes = (notes ?? []).filter((n) => n.note_type === "behavior");

  const todayStr = todayInCentral();
  const isVaccineExpired =
    !!pet.rabies_expires_at && pet.rabies_expires_at < todayStr;
  const upcomingAppointments = (appointments ?? [])
    .filter((a) => a.appointment_date >= todayStr && a.status !== "cancelled")
    .sort((a, b) =>
      a.appointment_date === b.appointment_date
        ? a.appointment_hour - b.appointment_hour
        : a.appointment_date.localeCompare(b.appointment_date),
    );
  const pastAppointments = (appointments ?? []).filter(
    (a) => a.appointment_date < todayStr || a.status === "cancelled",
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-foreground">{pet.name}</h1>
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

          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-foreground">
                  Grooming Notes
                </h2>
                <span className="text-xs text-muted">
                  {groomingNotes.length} note
                  {groomingNotes.length === 1 ? "" : "s"}
                </span>
              </div>
              <NoteForm petId={pet.id} noteType="grooming" />
              <div className="mt-4 space-y-2">
                {groomingNotes.length > 0 ? (
                  groomingNotes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg border border-border bg-background p-3 text-sm text-foreground/90"
                    >
                      <p>{n.note}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatDate(centralDateOnly(n.created_at))}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No grooming notes yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-foreground">
                  Behavior Notes
                </h2>
                <span className="text-xs text-muted">
                  {behaviorNotes.length} note
                  {behaviorNotes.length === 1 ? "" : "s"}
                </span>
              </div>
              <NoteForm petId={pet.id} noteType="behavior" />
              <div className="mt-4 space-y-2">
                {behaviorNotes.length > 0 ? (
                  behaviorNotes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg border border-border bg-background p-3 text-sm text-foreground/90"
                    >
                      <p>{n.note}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatDate(centralDateOnly(n.created_at))}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No behavior notes yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
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
              </>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
              Groom Photos
            </h2>
            <p className="mt-1 text-xs text-muted">
              Visible to {pet.profiles?.full_name ?? "the pet parent"} on
              their account.
            </p>
            <form
              action={uploadGroomPhoto}
              className="mt-3 space-y-2 border-b border-border pb-4"
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
                      <form action={deleteGroomPhoto.bind(null, photo.id, pet.id)}>
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
              <p className="mt-3 text-sm text-muted">No groom photos yet.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
              Membership
            </h2>
            {membership ? (
              <div className="mt-2">
                <MembershipCard
                  membership={{ ...membership, pets: { name: pet.name } }}
                  showCancel={false}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Not a member.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
              Groom Packs
            </h2>
            {groomPacks && groomPacks.length > 0 ? (
              <div className="mt-2 space-y-2">
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
              <p className="mt-2 text-sm text-muted">No groom packs.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
              Upcoming Appointments
            </h2>
            {upcomingAppointments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {upcomingAppointments.map((appt) => (
                  <AppointmentCard
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
                    <AppointmentCard
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
        </aside>
      </div>
    </div>
  );
}

interface AppointmentRow {
  id: string;
  appointment_date: string;
  appointment_hour: number;
  status: string;
  service: string;
  add_ons: string[];
  price: number;
  customer_note: string | null;
  haircut_description?: string | null;
  inspo_photo_path?: string | null;
}

function AppointmentCard({
  appt,
  inspoUrl,
  showActions = false,
}: {
  appt: AppointmentRow;
  inspoUrl?: string;
  showActions?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {formatDate(appt.appointment_date)}
        </p>
        <span className="shrink-0 rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-dark">
          {appt.status}
        </span>
      </div>
      <p className="text-xs text-muted">{formatHour(appt.appointment_hour)}</p>
      <p className="mt-1 text-xs text-foreground/90">
        {formatServiceLabel(appt.service)}
        {appt.add_ons?.length > 0 && ` · ${appt.add_ons.join(", ")}`}
      </p>
      <p className="mt-1 text-xs font-medium text-accent-dark">
        ${appt.price}
      </p>
      {appt.customer_note && (
        <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
          <span className="font-medium">Pet parent:</span>{" "}
          {appt.customer_note}
        </p>
      )}
      {appt.haircut_description && (
        <p className="mt-2 rounded-lg bg-accent-tint px-2.5 py-1.5 text-xs text-foreground/90">
          <span className="font-medium">Haircut request:</span>{" "}
          {appt.haircut_description}
        </p>
      )}
      {inspoUrl && (
        <a
          href={inspoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-accent-dark hover:underline"
        >
          View inspiration photo/PDF →
        </a>
      )}
      {showActions && (
        <div className="mt-3 flex flex-wrap gap-2">
          {appt.status === "requested" && (
            <form action={confirmAppointment.bind(null, appt.id)}>
              <button
                type="submit"
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Confirm
              </button>
            </form>
          )}
          {appt.status !== "completed" && (
            <form action={markAppointmentComplete.bind(null, appt.id)}>
              <button
                type="submit"
                className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
              >
                Mark Complete
              </button>
            </form>
          )}
          <Link
            href={`/admin/appointments/${appt.id}`}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Edit
          </Link>
          <CancelAppointmentButton appointmentId={appt.id} />
        </div>
      )}
    </div>
  );
}

function NoteForm({
  petId,
  noteType,
}: {
  petId: string;
  noteType: "grooming" | "behavior";
}) {
  return (
    <form action={addGroomNote} className="mt-4 space-y-2">
      <input type="hidden" name="petId" value={petId} />
      <input type="hidden" name="noteType" value={noteType} />
      <input
        name="note"
        type="text"
        placeholder={
          noteType === "grooming"
            ? "e.g. Took a size 4 blade on the body, sensitive around the ears…"
            : "e.g. Nervous around the dryer, great with nail trims…"
        }
        className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
      />
      <button
        type="submit"
        className="w-full rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
      >
        + New Note
      </button>
    </form>
  );
}
