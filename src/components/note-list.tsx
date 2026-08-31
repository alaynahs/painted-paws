import DeleteNoteButton from "@/components/delete-note-button";
import { deleteGroomNote } from "@/app/admin/actions";
import { centralDateOnly, formatDate } from "@/lib/format";

export default function NoteList({
  notes,
  noteUrls,
  petId,
  emptyLabel,
}: {
  notes: { id: string; note: string; created_at: string; rating: string | null }[];
  noteUrls: Record<string, string>;
  petId: string;
  emptyLabel: string;
}) {
  if (notes.length === 0) {
    return <p className="mt-4 text-sm text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="mt-4 space-y-2">
      {notes.map((n) => (
        <div
          key={n.id}
          className={`rounded-lg border p-3 text-sm text-foreground/90 ${
            n.rating === "caution"
              ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
              : "border-border bg-background"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            {n.rating === "caution" ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">
                ⚠ Caution
              </span>
            ) : (
              <span />
            )}
            <DeleteNoteButton action={deleteGroomNote.bind(null, n.id, petId)} />
          </div>
          {n.note && <p className="mt-1 whitespace-pre-wrap">{n.note}</p>}
          {noteUrls[n.id] && (
            <a
              href={noteUrls[n.id]}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage, not an optimizable static asset */}
              <img
                src={noteUrls[n.id]}
                alt="Note photo"
                className="max-h-40 rounded-lg object-cover"
              />
            </a>
          )}
          <p className="mt-1 text-xs text-muted">
            {formatDate(centralDateOnly(n.created_at))}
          </p>
        </div>
      ))}
    </div>
  );
}
