import PawIcon from "@/components/paw-icon";
import { updatePetPhoto } from "@/app/admin/actions";

// A small identity photo for the pet — deliberately modest in size (not a
// hero image), since it's just "who is this" at a glance next to the
// pet's name, not a gallery.
export default function PetPhoto({
  petId,
  photoUrl,
  returnPath,
}: {
  petId: string;
  photoUrl: string | null;
  returnPath?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-accent-tint">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage, not an optimizable static asset
          <img
            src={photoUrl}
            alt="Pet photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <PawIcon className="h-8 w-8 text-accent-dark opacity-50" />
        )}
      </div>
      <form action={updatePetPhoto} className="flex flex-col gap-1">
        <input type="hidden" name="petId" value={petId} />
        {returnPath && <input type="hidden" name="returnPath" value={returnPath} />}
        <input
          type="file"
          name="file"
          accept="image/*"
          className="block w-full text-xs text-foreground/80"
        />
        <button
          type="submit"
          className="self-start rounded-full border border-border px-3 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          {photoUrl ? "Change photo" : "Add photo"}
        </button>
      </form>
    </div>
  );
}
