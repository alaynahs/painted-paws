"use client";

import { useState } from "react";

export default function PaymentLinkEmailButton({
  action,
  portion,
  label,
  defaultEmail,
}: {
  action: (formData: FormData) => void | Promise<void>;
  portion: "full" | "deposit" | "remainder";
  label: string;
  defaultEmail: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEmail(defaultEmail ?? "");
          setOpen(true);
        }}
        className="rounded-full border border-blue-600 px-5 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-6"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg text-foreground">Send payment link</h3>
            <p className="mt-1 text-xs text-muted">
              Sent to this address only. Your saved email on the customer&apos;s
              profile is not changed.
            </p>
            <form action={action} className="mt-4 space-y-3">
              <input type="hidden" name="portion" value={portion} />
              <input
                type="email"
                name="overrideEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="customer@example.com"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
