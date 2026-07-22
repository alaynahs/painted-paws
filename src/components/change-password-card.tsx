"use client";

import { useState } from "react";

export default function ChangePasswordCard({
  updatePasswordAction,
}: {
  updatePasswordAction: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-foreground">Password</h2>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          {editing ? "Cancel" : "Change Password"}
        </button>
      </div>

      {editing && (
        <form action={updatePasswordAction} className="mt-4 space-y-4">
          <div>
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="account-password"
            >
              New password
            </label>
            <input
              id="account-password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
            />
          </div>
          <div>
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="account-confirm-password"
            >
              Confirm new password
            </label>
            <input
              id="account-confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Update Password
          </button>
        </form>
      )}
    </section>
  );
}
