"use client";

import { useState } from "react";
import BookingFlow from "@/components/booking-flow";
import { adminCreateAppointment } from "@/app/book/actions";
import type { PricingConfig } from "@/lib/pricing/pricing";
import type { CoatLength } from "@/lib/pricing/breeds";

interface Pet {
  id: string;
  name: string;
  species: "dog" | "cat";
  breed: string;
  coat: CoatLength;
  weight_lb: number;
  is_puppy?: boolean;
  birth_date?: string | null;
  rabies_vaccine_path?: string | null;
}

// Lets the admin book several pets for the same customer without leaving
// the page — pick a pet, fill out and submit its booking (which redirects
// back here), then immediately pick the next one. Each booking is still a
// fully separate BookingFlow submission under the hood; this just avoids
// having to re-search the customer or navigate between each pet's own page.
export default function AdminMultiPetBooking({
  customerId,
  pets,
  config,
}: {
  customerId: string;
  pets: Pet[];
  config: PricingConfig;
}) {
  const [expandedPetId, setExpandedPetId] = useState<string | null>(
    pets.length === 1 ? pets[0].id : null,
  );
  const returnTo = `/admin/book/customer/${customerId}`;

  return (
    <div>
      <p className="text-sm font-medium text-foreground">
        Pick a pet to book
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {pets.map((pet) => (
          <button
            key={pet.id}
            type="button"
            onClick={() =>
              setExpandedPetId((current) => (current === pet.id ? null : pet.id))
            }
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              expandedPetId === pet.id
                ? "border-accent bg-accent text-white"
                : "border-border bg-card text-foreground/80 hover:border-accent-dark"
            }`}
          >
            {pet.name}
          </button>
        ))}
      </div>

      {expandedPetId && (
        <div className="mt-6 border-t border-border pt-6">
          <BookingFlow
            key={expandedPetId}
            pets={pets.filter((p) => p.id === expandedPetId)}
            action={adminCreateAppointment}
            hiddenFields={{ customerId, returnTo }}
            allowOnlinePayment={false}
            config={config}
            isAdmin
          />
        </div>
      )}
    </div>
  );
}
