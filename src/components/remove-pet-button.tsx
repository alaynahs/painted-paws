"use client";

import { useState } from "react";
import { deletePet } from "@/app/account/actions";

export default function RemovePetButton({
  petId,
  petName,
}: {
  petId: string;
  petName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted hover:text-foreground"
      >
        Remove this pet
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-foreground">
              Remove {petName}?
            </p>
            <p className="mt-2 text-sm text-muted">
              This can&apos;t be undone. Their profile and grooming history
              will be removed from your account.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark"
              >
                No, keep them
              </button>
              <form action={deletePet.bind(null, petId)}>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Yes, remove
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
