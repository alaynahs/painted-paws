"use client";

export default function DeleteNoteButton({ action }: { action: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Delete this note? This can't be undone.")) action();
      }}
      className="text-xs text-muted hover:text-foreground"
    >
      Delete
    </button>
  );
}
