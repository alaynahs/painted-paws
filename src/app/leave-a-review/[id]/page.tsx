import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import TipSelector from "@/components/tip-selector";
import { REVIEW_LINK } from "@/lib/notifications/templates";

// Reached from the "ready for pickup" text — public, no login, since it's a
// one-tap link sent straight to the customer's phone.
export default async function LeaveReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipped?: string; error?: string; notip?: string }>;
}) {
  const { id } = await params;
  const { tipped, error, notip } = await searchParams;
  const supabase = createServiceClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, price, pets(name)")
    .eq("id", id)
    .single();

  if (!appointment) notFound();

  const pet = Array.isArray(appointment.pets)
    ? appointment.pets[0]
    : appointment.pets;

  const { data: photos } = await supabase
    .from("groom_photos")
    .select("id, storage_path, photo_type")
    .eq("appointment_id", appointment.id)
    .in("photo_type", ["before", "after"]);

  const photoUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from("groom-photos")
        .createSignedUrl(p.storage_path, 60 * 60 * 24);
      return { ...p, url: signed?.signedUrl ?? null };
    }),
  );
  const beforePhoto = photoUrls.find((p) => p.photo_type === "before" && p.url);
  const afterPhoto = photoUrls.find((p) => p.photo_type === "after" && p.url);

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Thank you!
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {pet?.name ?? "Your pet"} is all set 🐾
      </h1>
      <p className="mt-3 text-muted">
        Thanks so much for trusting us with {pet?.name ?? "your pet"}{" "}
        today. We&apos;d love to hear how it went.
      </p>

      {tipped && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          Tip sent. Thank you so much for your generosity!
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <a
        href={REVIEW_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-block rounded-full bg-accent px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
      >
        ⭐ Leave a Review
      </a>

      {!notip && (
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-left">
          <TipSelector appointmentId={appointment.id} price={appointment.price} />
        </div>
      )}

      {(beforePhoto || afterPhoto) && (
        <div className="mt-10 text-left">
          <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
            Before &amp; After
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              {beforePhoto?.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage, not an optimizable static asset
                <img
                  src={beforePhoto.url}
                  alt={`${pet?.name ?? "Pet"} before`}
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted">
                  Before photo coming soon
                </div>
              )}
              <p className="mt-1.5 text-center text-xs text-muted">Before</p>
            </div>
            <div>
              {afterPhoto?.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage, not an optimizable static asset
                <img
                  src={afterPhoto.url}
                  alt={`${pet?.name ?? "Pet"} after`}
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted">
                  After photo coming soon
                </div>
              )}
              <p className="mt-1.5 text-center text-xs text-muted">After</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
