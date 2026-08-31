import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { sendPaymentLinkEmail, getNoShowCount } from "@/app/book/actions";
import { markAppointmentPaid, setAppointmentDuration } from "@/app/admin/actions";
import BookingFlow from "@/components/booking-flow";
import CancelAppointmentButton from "@/components/cancel-appointment-button";
import QuickMessageButtons from "@/components/quick-message-buttons";
import RefundButton from "@/components/refund-button";
import MarkCompleteButton from "@/components/mark-complete-button";
import PetPhoto from "@/components/pet-photo";
import CollapsibleCard from "@/components/collapsible-card";
import GroomingRecipeCard from "@/components/grooming-recipe-card";
import PriceBreakdownCard from "@/components/price-breakdown-card";
import AppointmentStageTracker from "@/components/appointment-stage-tracker";
import TodaysAppointmentsStrip, {
  type StripAppointment,
} from "@/components/todays-appointments-strip";
import AppointmentHistoryList from "@/components/appointment-history-list";
import MembershipCard from "@/components/membership-card";
import NoteForm from "@/components/note-form";
import NoteList from "@/components/note-list";
import PetAppointmentCard from "@/components/pet-appointment-card";
import { deleteGroomPhoto, uploadGroomPhoto } from "@/app/admin/actions";
import { normalizeGroomRecipe } from "@/lib/groom-recipe";
import {
  CAT_ADD_ON_NAMES,
  CREATIVE_TIER_LABELS,
  DOG_ADD_ON_NAMES,
  GROOM_PACK_SERVICE_LABELS,
  PACKAGE_LABELS,
  monthsSince,
  type CreativeTier,
  type GroomPackService,
  type PackageTier,
} from "@/lib/pricing/pricing";
import { getPricingConfig } from "@/lib/pricing/config";
import { estimateDurationMinutes } from "@/lib/schedule-duration";
import { centralDateOnly, formatDate, todayInCentral } from "@/lib/format";
import { MAX_NO_SHOWS } from "@/lib/booking-hours";

export default async function AdminEditAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*, pets(*), profiles:customer_id(full_name, phone, email, do_not_book)")
    .eq("id", id)
    .single();

  if (!appointment || !appointment.pets) notFound();
  const pet = appointment.pets;
  const appointmentPath = `/admin/appointments/${appointment.id}`;

  const sendPaymentLinkWithId = sendPaymentLinkEmail.bind(null, appointment.id);
  const markPaidWithId = markAppointmentPaid.bind(null, appointment.id);
  const config = await getPricingConfig();
  const depositAmount = Math.round((appointment.price / 2) * 100) / 100;
  const remainingAmount =
    Math.round((appointment.price - appointment.amount_paid) * 100) / 100;

  let promoDiscountPercent: number | null = null;
  if (appointment.promo_id) {
    const { data: promo } = await supabase
      .from("promotions")
      .select("discount_percent")
      .eq("id", appointment.promo_id)
      .single();
    promoDiscountPercent = promo?.discount_percent ?? null;
  }

  const addOns: string[] = appointment.add_ons ?? [];
  const catalog = pet.species === "dog" ? DOG_ADD_ON_NAMES : CAT_ADD_ON_NAMES;
  const addOnNames = addOns.filter((a) => catalog.includes(a));

  const creativeTier =
    (Object.entries(CREATIVE_TIER_LABELS) as [CreativeTier, string][]).find(
      ([, label]) => addOns.includes(label),
    )?.[0] ?? "none";

  const packageTier =
    (Object.entries(PACKAGE_LABELS) as [PackageTier, string][]).find(
      ([, label]) => addOns.includes(label),
    )?.[0] ?? "none";

  // Everything else on this page is the pet's own long-term record, folded
  // in alongside this specific visit so there's one screen instead of two.
  const [
    { data: petPhotoSigned },
    { data: vaccineSigned },
    { data: notes },
    { data: membership },
    { data: groomPacks },
    { data: groomPhotos },
    { data: sameDayAppts },
    { data: history },
    { data: petAppointments },
  ] = await Promise.all([
    pet.photo_path
      ? supabase.storage.from("pet-photos").createSignedUrl(pet.photo_path, 60 * 10)
      : Promise.resolve({ data: null }),
    pet.rabies_vaccine_path
      ? supabase.storage
          .from("vaccine-records")
          .createSignedUrl(pet.rabies_vaccine_path, 60 * 10)
      : Promise.resolve({ data: null }),
    supabase
      .from("groom_notes")
      .select("*")
      .eq("pet_id", pet.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("*")
      .eq("pet_id", pet.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("groom_credit_packs")
      .select("*")
      .eq("pet_id", pet.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("groom_photos")
      .select("id, storage_path, caption, created_at")
      .eq("pet_id", pet.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("id, appointment_hour, appointment_minute, status, pets(name)")
      .eq("appointment_date", appointment.appointment_date)
      .neq("status", "cancelled")
      .order("appointment_hour", { ascending: true })
      .order("appointment_minute", { ascending: true }),
    supabase
      .from("appointment_history")
      .select("id, action, actor_type, note, created_at, profiles:actor_id(full_name)")
      .eq("appointment_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("*")
      .eq("pet_id", pet.id)
      .order("appointment_date", { ascending: false })
      .order("appointment_hour", { ascending: false })
      .order("appointment_minute", { ascending: false }),
  ]);

  const petPhotoUrl = petPhotoSigned?.signedUrl ?? null;
  const vaccineUrl = vaccineSigned?.signedUrl ?? null;

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
  const isPuppyExempt =
    pet.species === "dog" && !!pet.birth_date && monthsSince(pet.birth_date) < 4;
  const isVaccineExpired =
    !!pet.rabies_expires_at && pet.rabies_expires_at < todayStr;
  const noShowCount = await getNoShowCount(supabase, appointment.customer_id);

  const inspoUrls: Record<string, string> = {};
  await Promise.all(
    (petAppointments ?? [])
      .filter((a) => a.inspo_photo_path)
      .map(async (a) => {
        const { data: signed } = await supabase.storage
          .from("inspo-photos")
          .createSignedUrl(a.inspo_photo_path, 60 * 10);
        if (signed?.signedUrl) inspoUrls[a.id] = signed.signedUrl;
      }),
  );

  const upcomingAppointments = (petAppointments ?? []).filter(
    (a) => a.appointment_date >= todayStr && a.status !== "cancelled",
  );
  const pastAppointments = (petAppointments ?? []).filter(
    (a) => a.appointment_date < todayStr || a.status === "cancelled",
  );

  const stripAppointments: StripAppointment[] = (sameDayAppts ?? []).map((a) => {
    const p = Array.isArray(a.pets) ? a.pets[0] : a.pets;
    return {
      id: a.id,
      hour: a.appointment_hour,
      minute: a.appointment_minute,
      petName: p?.name ?? "Unknown pet",
      status: a.status,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin · Appointment
      </p>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <PetPhoto
            petId={pet.id}
            photoUrl={petPhotoUrl}
            returnPath={`/admin/appointments/${appointment.id}`}
          />
          <div>
            <h1 className="font-serif text-3xl text-foreground">
              {pet.name}&apos;s Appointment
            </h1>
            <p className="mt-1 text-sm text-muted">
              {appointment.profiles?.full_name ?? "Unknown owner"}
              {appointment.profiles?.phone ? ` · ${appointment.profiles.phone}` : ""}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/pets/${pet.id}`}
          className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          View full pet record →
        </Link>
      </div>

      {noShowCount > 0 && (
        <p
          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
            noShowCount >= MAX_NO_SHOWS
              ? "bg-accent text-white"
              : "bg-accent-tint text-accent-dark"
          }`}
        >
          {noShowCount} no-show{noShowCount === 1 ? "" : "s"}
          {noShowCount >= MAX_NO_SHOWS ? " (blocked from online booking)" : ""}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}

      <div className="mt-5">
        <TodaysAppointmentsStrip
          appointments={stripAppointments}
          currentAppointmentId={appointment.id}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <AppointmentStageTracker
            appointmentId={appointment.id}
            checkedInAt={appointment.checked_in_at}
            groomStartedAt={appointment.groom_started_at}
            readyAt={appointment.ready_at}
            checkoutSlot={
              appointment.status === "completed" ? (
                <p className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground/90">
                  ✓ Marked complete — thank-you email sent
                </p>
              ) : (
                <MarkCompleteButton appointmentId={appointment.id} compact />
              )
            }
          />

          <PriceBreakdownCard
            price={appointment.price}
            salesTax={appointment.sales_tax ?? 0}
            paymentStatus={appointment.payment_status}
            amountPaid={appointment.amount_paid ?? 0}
          />

          {appointment.payment_status === "unpaid" && (
            <div className="flex flex-wrap gap-3">
              <form action={sendPaymentLinkWithId}>
                <input type="hidden" name="portion" value="full" />
                <button
                  type="submit"
                  className="rounded-full border border-blue-600 px-5 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
                >
                  Email Payment Link (${appointment.price})
                </button>
              </form>
              <form action={sendPaymentLinkWithId}>
                <input type="hidden" name="portion" value="deposit" />
                <button
                  type="submit"
                  className="rounded-full border border-blue-600 px-5 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
                >
                  Email 50% Deposit Link (${depositAmount})
                </button>
              </form>
              <form action={markPaidWithId}>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Mark Paid
                </button>
              </form>
            </div>
          )}

          {appointment.payment_status === "deposit_paid" && (
            <div className="flex flex-wrap gap-3">
              <form action={sendPaymentLinkWithId}>
                <input type="hidden" name="portion" value="remainder" />
                <button
                  type="submit"
                  className="rounded-full border border-blue-600 px-5 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
                >
                  Email Remaining Balance Link (${remainingAmount})
                </button>
              </form>
              <form action={markPaidWithId}>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Mark Fully Paid
                </button>
              </form>
            </div>
          )}

          {appointment.payment_status === "paid" && (
            <div>
              <RefundButton appointmentId={appointment.id} price={appointment.price} />
              <p className="mt-1.5 text-xs text-muted">
                {appointment.stripe_payment_intent_id
                  ? "Refunds the actual Stripe charge back to their card."
                  : "No Stripe payment on record for this one — refund it directly in the Stripe dashboard instead."}
              </p>
            </div>
          )}

          <div>
            <QuickMessageButtons appointmentId={appointment.id} />
          </div>

          <GroomingRecipeCard
            petId={pet.id}
            recipe={normalizeGroomRecipe(pet.groom_recipe)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <CollapsibleCard title="Grooming Notes" count={groomingNotes.length}>
              <NoteForm petId={pet.id} noteType="grooming" returnPath={appointmentPath} />
              <NoteList
                notes={groomingNotes}
                noteUrls={noteUrls}
                petId={pet.id}
                emptyLabel="No grooming notes yet."
              returnPath={appointmentPath} />
            </CollapsibleCard>

            <CollapsibleCard title="Behavior Notes" count={behaviorNotes.length}>
              <NoteForm petId={pet.id} noteType="behavior" returnPath={appointmentPath} />
              <NoteList
                notes={behaviorNotes}
                noteUrls={noteUrls}
                petId={pet.id}
                emptyLabel="No behavior notes yet."
              returnPath={appointmentPath} />
            </CollapsibleCard>
          </div>

          <CollapsibleCard
            title="Pet Parent / Service Notes"
            count={parentNotes.length}
          >
            <NoteForm petId={pet.id} noteType="parent" returnPath={appointmentPath} />
            <NoteList
              notes={parentNotes}
              noteUrls={noteUrls}
              petId={pet.id}
              emptyLabel="No pet parent / service notes yet."
            returnPath={appointmentPath} />
          </CollapsibleCard>

          <CollapsibleCard title="Blocked Length">
            <p className="text-xs text-muted">
              By default this blocks about{" "}
              {(
                (appointment.duration_minutes ??
                  estimateDurationMinutes(appointment.service, addOns)) / 60
              ).toFixed(1)}{" "}
              hour(s) on the schedule. Set a different length if this one
              will run long or short — leave blank for the default estimate.
            </p>
            <form
              action={setAppointmentDuration}
              className="mt-3 flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="appointmentId" value={appointment.id} />
              <label className="block">
                <span className="text-xs text-muted">Hours</span>
                <input
                  type="number"
                  name="durationHours"
                  min={0.5}
                  step={0.5}
                  defaultValue={
                    appointment.duration_minutes
                      ? appointment.duration_minutes / 60
                      : undefined
                  }
                  placeholder="Default"
                  className="mt-1 w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Save
              </button>
            </form>
          </CollapsibleCard>

          <Link
            href={`/admin/appointments/${appointment.id}/photos`}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent-dark"
          >
            <span>
              <span className="block text-sm font-medium text-foreground">
                Before &amp; After Photos
              </span>
              <span className="mt-1 block text-xs text-muted">
                Upload what goes on the review/tip page.
              </span>
            </span>
            <span className="text-accent-dark">→</span>
          </Link>

          <details className="rounded-2xl border border-border bg-card p-5">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Edit booking details
            </summary>
            <div className="mt-6">
              <BookingFlow
                pets={[pet]}
                mode="edit"
                appointmentId={appointment.id}
                initial={{
                  service: appointment.service,
                  deshed: addOns.includes("De-shed treatment"),
                  waterless: addOns.includes("Waterless"),
                  creativeTier,
                  addOnNames,
                  packageTier,
                  standalone: appointment.service === "standalone",
                  date: appointment.appointment_date,
                  hour: appointment.appointment_hour,
                  minute: appointment.appointment_minute,
                  paymentMethod: appointment.payment_method,
                  customerNote: appointment.customer_note ?? "",
                  pickupDropoff: appointment.pickup_dropoff ?? false,
                  pickupAddress: appointment.pickup_address ?? "",
                  promoDiscountPercent,
                  advanceBookingDiscount: appointment.advance_booking_discount ?? 0,
                  adminDiscountType: "exact",
                  adminDiscountValue: String(
                    Math.round(
                      (appointment.price - (appointment.sales_tax ?? 0)) * 100,
                    ) / 100,
                  ),
                }}
                config={config}
                isAdmin
              />
            </div>
          </details>

          <CancelAppointmentButton
            appointmentId={appointment.id}
            isAdmin
            variant="link"
          />
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

          <CollapsibleCard title="Groom Photos" count={groomPhotoUrls.length}>
            <form
              action={uploadGroomPhoto}
              className="space-y-2 border-b border-border pb-4"
            >
              <input type="hidden" name="petId" value={pet.id} />
              <input type="hidden" name="returnPath" value={appointmentPath} />
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
                      <form
                        action={deleteGroomPhoto.bind(null, photo.id, pet.id, undefined)}
                      >
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">No groom packs.</p>
            )}
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
              <p className="mt-3 text-sm text-muted">No upcoming appointments.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
              Past Appointments
            </h2>
            {pastAppointments.length > 0 ? (
              <div className="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                {pastAppointments.slice(0, 5).map((appt) => (
                  <PetAppointmentCard
                    key={appt.id}
                    appt={appt}
                    inspoUrl={inspoUrls[appt.id]}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No past appointments.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
                Appointment History
              </h2>
              <Link
                href={`/admin/appointments/${appointment.id}/history`}
                className="text-xs text-accent-dark hover:underline"
              >
                Full log →
              </Link>
            </div>
            <div className="mt-3">
              <AppointmentHistoryList history={(history ?? []).slice(0, 5)} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
