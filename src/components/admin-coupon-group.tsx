"use client";

import { useState } from "react";
import {
  getCustomersByGroup,
  createCouponsForGroup,
  type CustomerGroup,
  type GroupMember,
} from "@/app/admin/coupons/actions";

const GROUP_OPTIONS: { value: CustomerGroup; label: string }[] = [
  { value: "never_booked", label: "Signed up, never booked" },
  { value: "no_visit_8wk", label: "Haven't booked in 8+ weeks" },
  { value: "no_visit_12wk", label: "Haven't booked in 12+ weeks" },
  { value: "no_visit_16wk", label: "Haven't booked in 16+ weeks" },
];

export default function AdminCouponGroup() {
  const [group, setGroup] = useState<CustomerGroup | "">("");
  const [members, setMembers] = useState<GroupMember[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSelect(value: string) {
    const g = value as CustomerGroup;
    setGroup(g);
    setMembers(null);
    if (!value) return;
    setLoading(true);
    const found = await getCustomersByGroup(g);
    setMembers(found);
    setLoading(false);
  }

  return (
    <div>
      <select
        value={group}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
      >
        <option value="">Choose a group…</option>
        {GROUP_OPTIONS.map((g) => (
          <option key={g.value} value={g.value}>
            {g.label}
          </option>
        ))}
      </select>

      {loading && <p className="mt-4 text-sm text-muted">Loading…</p>}

      {!loading && members && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted">
            {members.length === 0
              ? "No customers currently match this group."
              : `${members.length} customer${members.length === 1 ? "" : "s"} match:`}
          </p>

          {members.length > 0 && (
            <>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-foreground/80">
                {members.map((m) => (
                  <li key={m.id}>{m.full_name ?? m.email ?? "Unknown"}</li>
                ))}
              </ul>

              <form
                action={createCouponsForGroup}
                className="mt-4 flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="group" value={group} />
                <input
                  type="number"
                  name="discountPercent"
                  min={1}
                  max={100}
                  step={1}
                  required
                  placeholder="% off"
                  className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
                />
                <input
                  type="text"
                  name="note"
                  placeholder="Note (optional)"
                  className="min-w-[140px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Give Coupon to All {members.length}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
