"use client";

import { useState } from "react";
import Link from "next/link";
import { searchCustomersByPhone } from "@/app/book/actions";
import type { CoatLength } from "@/lib/pricing/breeds";

interface Pet {
  id: string;
  name: string;
  species: "dog" | "cat";
  breed: string;
  coat: CoatLength;
  weight_lb: number;
  hasMembership?: boolean;
}

interface CustomerResult {
  id: string;
  full_name: string | null;
  phone: string | null;
  pets: Pet[];
}

export default function AdminBookingSearch() {
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<CustomerResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    setSearching(true);
    const found = await searchCustomersByPhone(phone);
    setResults(found as CustomerResult[]);
    setSearching(false);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by phone number…"
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !phone.trim()}
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {results && results.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          No customers found with that phone number.
        </p>
      )}

      {results && results.length > 0 && (
        <div className="mt-6 space-y-4">
          {results.map((customer) => (
            <div
              key={customer.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <p className="font-serif text-base text-foreground">
                {customer.full_name ?? "Unknown owner"}
              </p>
              <p className="text-xs text-muted">{customer.phone}</p>
              {customer.pets.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {customer.pets.map((pet) => (
                    <Link
                      key={pet.id}
                      href={`/admin/pets/${pet.id}`}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground/90 transition-colors hover:border-accent-dark hover:text-accent-dark"
                    >
                      {pet.name} ({pet.breed})
                      {pet.hasMembership && (
                        <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-dark">
                          Member
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted">
                  No pets saved for this customer yet.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
