"use client";

import { useState } from "react";
import Link from "next/link";
import { searchCustomers } from "@/app/book/actions";
import { createCoupon } from "@/app/admin/coupons/actions";
import CouponDiscountInputs from "@/components/coupon-discount-inputs";

interface CustomerResult {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

export default function AdminCouponSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    setSearching(true);
    const found = await searchCustomers(query);
    setResults(found as CustomerResult[]);
    setSearching(false);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by name, phone, email, or pet name…"
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {results && results.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          No customers found matching that name, phone, email, or pet name.
        </p>
      )}

      {results && results.length > 0 && (
        <div className="mt-6 space-y-4">
          {results.map((customer) => (
            <div
              key={customer.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <Link
                href={`/admin/customers/${customer.id}`}
                className="font-serif text-base text-foreground hover:text-accent-dark hover:underline"
              >
                {customer.full_name ?? "Unknown owner"}
              </Link>
              <p className="text-xs text-muted">
                {customer.phone}
                {customer.phone && customer.email ? " · " : ""}
                {customer.email}
              </p>
              <form
                action={createCoupon.bind(null, customer.id)}
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <CouponDiscountInputs />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
                >
                  Give Coupon
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
