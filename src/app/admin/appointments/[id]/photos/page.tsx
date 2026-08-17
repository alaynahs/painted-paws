import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { deleteGroomPhoto, uploadGroomPhoto } from "@/app/admin/actions";

export default async function AppointmentBeforeAfterPage({
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
    .select("id, pets(id, name)")
    .eq("id", id)
    .single();

  if (!appointment || !appointment.pets) notFound();
  const pet = Array.isArray(appointment.pets) ? appointment.pets[0] : appointment.pets;

  const { data: photos } = await supabase
    .from("groom_photos")
    .select("id, storage_path, photo_type, created_at")
    .eq("appointment_id", appointment.id)
    .in("photo_type", ["before", "after"])
    .order("created_at", { ascending: false });

  const photoUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from("groom-photos")
        .createSignedUrl(p.storage_path, 60 * 10);
      return { ...p, url: signed?.signedUrl ?? null };
    }),
  );
  const beforePhotos = photoUrls.filter((p) => p.photo_type === "before");
  const afterPhotos = photoUrls.filter((p) => p.photo_type === "after");

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin · Before &amp; After Photos
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        {pet.name}&apos;s Appointment
      </h1>
      <p className="mt-1 text-xs text-muted">
        Uploaded here show up on the review/tip page linked from the
        &quot;Before and After Pictures&quot; email once you mark this
        appointment complete.
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {(["before", "after"] as const).map((type) => {
          const typePhotos = type === "before" ? beforePhotos : afterPhotos;
          return (
            <div key={type} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium tracking-wide text-accent-dark uppercase">
                {type}
              </p>
              <form
                action={uploadGroomPhoto}
                className="mt-2 space-y-2 border-b border-border pb-3"
              >
                <input type="hidden" name="petId" value={pet.id} />
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <input type="hidden" name="photoType" value={type} />
                <input
                  type="hidden"
                  name="returnPath"
                  value={`/admin/appointments/${appointment.id}/photos`}
                />
                <input
                  type="file"
                  name="file"
                  accept="image/*"
                  required
                  className="block w-full text-xs text-foreground/80"
                />
                <button
                  type="submit"
                  className="w-full rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  + Upload {type}
                </button>
              </form>
              {typePhotos.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {typePhotos.map((photo) =>
                    photo.url ? (
                      <div key={photo.id} className="space-y-1">
                        <a href={photo.url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from private storage, not an optimizable static asset */}
                          <img
                            src={photo.url}
                            alt={`${type} photo`}
                            className="aspect-square w-full rounded-lg object-cover"
                          />
                        </a>
                        <form
                          action={deleteGroomPhoto.bind(
                            null,
                            photo.id,
                            pet.id,
                            appointment.id,
                          )}
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
                <p className="mt-2 text-xs text-muted">No {type} photo yet.</p>
              )}
            </div>
          );
        })}
      </div>

      <Link
        href={`/admin/appointments/${appointment.id}`}
        className="mt-8 inline-block text-sm text-muted hover:text-accent-dark"
      >
        ← Back to appointment
      </Link>
    </div>
  );
}
