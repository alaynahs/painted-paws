"use client";

import { useState } from "react";

export default function FirstTimePasswordPrompt({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-accent-dark hover:underline"
      >
        Haven&apos;t created a password yet?
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 text-left">
      <p className="text-sm text-foreground/90">
        If Painted Paws booked your first appointment for you, your account
        may not have a password yet. Enter your email and we&apos;ll check.
      </p>
      <form action={action} className="mt-3 space-y-3">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Check my account
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
