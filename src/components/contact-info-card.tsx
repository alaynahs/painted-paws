"use client";

import { useState } from "react";

export default function ContactInfoCard({
  fullName,
  phone,
  email,
  updateProfileAction,
  updateEmailAction,
  updatePasswordAction,
}: {
  fullName: string;
  phone: string;
  email: string;
  updateProfileAction: (formData: FormData) => void;
  updateEmailAction: (formData: FormData) => void;
  updatePasswordAction: (formData: FormData) => void;
}) {
  const hasInfo = Boolean(fullName && phone);
  const [editing, setEditing] = useState(!hasInfo);

  if (!editing) {
    return (
      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-lg text-foreground">
            Privacy &amp; Security
          </h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
          >
            Edit
          </button>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted">Name</dt>
            <dd className="text-foreground/90">{fullName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted">Phone</dt>
            <dd className="text-foreground/90">{phone}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted">Email</dt>
            <dd className="text-foreground/90">{email}</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-foreground">
          Privacy &amp; Security
        </h2>
        {hasInfo && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>

      <form action={updateProfileAction} className="mt-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="fullName">
            Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            defaultValue={fullName}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="phone">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={phone}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Save
        </button>
      </form>

      <form action={updateEmailAction} className="mt-6 space-y-4 border-t border-border pt-6">
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
          <p className="mt-1 text-xs text-muted">
            Changing your email will send a confirmation link to the new
            address.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Update Email
        </button>
      </form>

      <form action={updatePasswordAction} className="mt-6 space-y-4 border-t border-border pt-6">
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="account-current-password"
          >
            Current password
          </label>
          <input
            id="account-current-password"
            name="currentPassword"
            type="password"
            required
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
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
          className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Update Password
        </button>
      </form>
    </section>
  );
}
