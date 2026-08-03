"use client";

import { useState } from "react";
import Link from "next/link";
import { searchCustomers } from "@/app/book/actions";
import { adminCreateMembership } from "@/app/membership/actions";
import MembershipTierPicker from "@/components/membership-tier-picker";
import type { CoatLength } from "@/lib/pricing/breeds";
import type { PricingConfig } from "@/lib/pricing/pricing";

interface Pet {
  id: string;
  name: string;
  breed: string;
  species: "dog" | "cat";
  weight_lb: number;
  coat: CoatLength;
}

interface CustomerResult {
  id: string;
  full_name: string | null;
  phone: string | null;
  pets: Pet[];
}

export default function AdminMembershipSearch({
  config,
}: {
  config: PricingConfig;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerResult | null>(null);

  async function handleSearch() {
    setSearching(true);
    setSelectedCustomer(null);
    const found = await searchCustomers(query);
    setResults(found as CustomerResult[]);
    setSearching(false);
  }

  if (selectedCustomer) {
    const dogPets = selectedCustomer.pets.filter((p) => p.species === "dog");
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedCustomer(null)}
          className="text-sm text-accent-dark hover:underline"
        >
          ← Back to search
        </button>
        <div className="mt-4 rounded-2xl border border-border bg-accent-tint p-4">
          <p className="text-sm text-foreground">
            Setting up a membership for{" "}
            <span className="font-medium">
              {selectedCustomer.full_name ?? "Unknown owner"}
            </span>
            {selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}
          </p>
        </div>
        <div className="mt-6">
          <MembershipTierPicker
            pets={dogPets}
            action={adminCreateMembership}
            hiddenFields={{ customerId: selectedCustomer.id }}
            submitLabel="Set Up Membership"
            config={config}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by phone, email, or pet name…"
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
          No customers found matching that phone, email, or pet name.
        </p>
      )}

      {results && results.length > 0 && (
        <div className="mt-6 space-y-3">
          {results.map((customer) => {
            const dogCount = customer.pets.filter(
              (p) => p.species === "dog",
            ).length;
            return (
              <div
                key={customer.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(customer)}
                  className="block w-full text-left transition-colors hover:text-accent-dark"
                >
                  <p className="font-serif text-base text-foreground">
                    {customer.full_name ?? "Unknown owner"}
                  </p>
                  <p className="text-xs text-muted">{customer.phone}</p>
                  <p className="mt-1 text-xs text-muted">
                    {dogCount} dog{dogCount === 1 ? "" : "s"} on file
                  </p>
                </button>
                {dogCount === 0 && (
                  <Link
                    href={`/admin/pets/new?customerId=${customer.id}`}
                    className="mt-2 inline-block rounded-full border border-border bg-background px-4 py-2 text-xs text-foreground/90 transition-colors hover:border-accent-dark hover:text-accent-dark"
                  >
                    + Add their first dog
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
