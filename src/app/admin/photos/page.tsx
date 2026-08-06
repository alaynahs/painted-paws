import { requireAdmin } from "@/lib/supabase/admin";
import {
  uploadSitePhoto,
  updateSitePhoto,
  deleteSitePhoto,
  moveSitePhoto,
  type PhotoLocation,
} from "./actions";

interface SitePhoto {
  id: string;
  location: PhotoLocation;
  storage_path: string;
  caption: string;
  tag: string | null;
  sort_order: number;
}

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await searchParams;

  const { data: photos } = await supabase
    .from("site_photos")
    .select("*")
    .order("sort_order", { ascending: true });

  const all = (photos ?? []) as SitePhoto[];
  const heroPhotos = all.filter((p) => p.location === "hero");
  const portfolioPhotos = all.filter((p) => p.location === "portfolio");

  function publicUrl(storagePath: string) {
    return supabase.storage.from("site-photos").getPublicUrl(storagePath).data
      .publicUrl;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Manage Photos
      </h1>
      <p className="mt-3 text-sm text-muted">
        Upload, edit, reorder, or remove photos shown on the Portfolio page
        and the homepage gallery.
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <PhotoSection
        title="Homepage Gallery"
        location="hero"
        photos={heroPhotos}
        publicUrl={publicUrl}
        showTag={false}
      />
      <PhotoSection
        title="Portfolio Photos"
        location="portfolio"
        photos={portfolioPhotos}
        publicUrl={publicUrl}
        showTag
      />
    </div>
  );
}

function PhotoSection({
  title,
  location,
  photos,
  publicUrl,
  showTag,
}: {
  title: string;
  location: PhotoLocation;
  photos: SitePhoto[];
  publicUrl: (path: string) => string;
  showTag: boolean;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl text-foreground">{title}</h2>

      <form
        action={uploadSitePhoto}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"
      >
        <input type="hidden" name="location" value={location} />
        <div>
          <label className="text-xs font-medium text-foreground">
            Photo
          </label>
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="mt-1 block text-sm text-foreground/90"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">
            Caption
          </label>
          <input
            type="text"
            name="caption"
            required
            className="mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        {showTag && (
          <div>
            <label className="text-xs font-medium text-foreground">
              Tag
            </label>
            <input
              type="text"
              name="tag"
              placeholder="e.g. Bath & Full Groom"
              className="mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
            />
          </div>
        )}
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          + Add Photo
        </button>
      </form>

      {photos.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No photos yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, i) => {
            const updateWithId = updateSitePhoto.bind(null, photo.id);
            const deleteWithId = deleteSitePhoto.bind(null, photo.id);
            const moveUp = moveSitePhoto.bind(null, photo.id, location, "up");
            const moveDown = moveSitePhoto.bind(
              null,
              photo.id,
              location,
              "down",
            );

            return (
              <div
                key={photo.id}
                className="rounded-2xl border border-border bg-card p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded photos, not known at build time */}
                <img
                  src={publicUrl(photo.storage_path)}
                  alt={photo.caption}
                  className="aspect-square w-full rounded-xl object-cover"
                />

                <form action={updateWithId} className="mt-3 space-y-2">
                  <input
                    type="text"
                    name="caption"
                    defaultValue={photo.caption}
                    placeholder="Caption"
                    className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-accent-dark"
                  />
                  {showTag && (
                    <input
                      type="text"
                      name="tag"
                      defaultValue={photo.tag ?? ""}
                      placeholder="Tag"
                      className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-accent-dark"
                    />
                  )}
                  <input
                    type="file"
                    name="file"
                    accept="image/*"
                    className="block w-full text-xs text-foreground/80"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
                  >
                    Save
                  </button>
                </form>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <form action={moveUp}>
                      <button
                        type="submit"
                        disabled={i === 0}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-accent-dark disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveDown}>
                      <button
                        type="submit"
                        disabled={i === photos.length - 1}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-accent-dark disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                  </div>
                  <form action={deleteWithId}>
                    <button
                      type="submit"
                      className="text-xs text-muted hover:text-accent-dark"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
