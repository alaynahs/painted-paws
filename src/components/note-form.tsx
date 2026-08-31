import { addGroomNote } from "@/app/admin/actions";

export default function NoteForm({
  petId,
  noteType,
}: {
  petId: string;
  noteType: "grooming" | "behavior" | "parent";
}) {
  const placeholder =
    noteType === "grooming"
      ? "e.g. Took a size 4 blade on the body, sensitive around the ears…"
      : noteType === "behavior"
        ? "e.g. Nervous around the dryer, great with nail trims…"
        : "e.g. Always 15 min late, great tipper, prefers text over calls…";
  const isMultiline = noteType === "parent";

  return (
    <form action={addGroomNote} className="mt-4 space-y-2">
      <input type="hidden" name="petId" value={petId} />
      <input type="hidden" name="noteType" value={noteType} />
      {isMultiline ? (
        <textarea
          name="note"
          rows={3}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      ) : (
        <input
          name="note"
          type="text"
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      )}
      <input
        name="photo"
        type="file"
        accept="image/*"
        className="block w-full text-xs text-foreground/80"
      />
      <p className="text-[10px] text-muted">
        Photo is just for you — never shown to the pet parent.
      </p>
      <label className="flex items-center gap-2 text-xs text-foreground/90">
        <input
          type="checkbox"
          name="rating"
          value="caution"
          className="h-3.5 w-3.5 rounded border-border accent-red-600"
        />
        ⚠ Mark as Caution — shows up automatically next time this pet is on
        the schedule
      </label>
      <button
        type="submit"
        className="w-full rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
      >
        + New Note
      </button>
    </form>
  );
}
