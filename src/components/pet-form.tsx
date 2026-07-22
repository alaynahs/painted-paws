"use client";

import { useMemo, useState } from "react";
import {
  DOG_BREEDS,
  CAT_BREEDS,
  findBreed,
  findCatBreed,
  type CoatLength,
} from "@/lib/pricing/breeds";
import { monthsSince } from "@/lib/pricing/pricing";
import BirthdatePicker from "@/components/birthdate-picker";

type Species = "dog" | "cat";

export interface PetFormValues {
  petId?: string;
  name: string;
  species: Species;
  breed: string;
  coat: CoatLength;
  weightLb: number;
  color: string;
  healthConcerns: string;
  birthDate: string | null;
}

export default function PetForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<PetFormValues>;
  submitLabel: string;
}) {
  const [species, setSpecies] = useState<Species>(
    defaultValues?.species ?? "dog",
  );
  const [breed, setBreed] = useState(defaultValues?.breed ?? "");
  const [manualCoat, setManualCoat] = useState<CoatLength>(
    defaultValues?.coat ?? "short",
  );
  const [birthDate, setBirthDate] = useState(defaultValues?.birthDate ?? "");
  const isPuppy =
    species === "dog" && birthDate !== "" && monthsSince(birthDate) < 6;
  const breedOptions = species === "dog" ? DOG_BREEDS : CAT_BREEDS;

  const matchedBreed = useMemo(
    () =>
      species === "dog"
        ? findBreed(breed.trim())
        : findCatBreed(breed.trim()),
    [species, breed],
  );
  const coat = matchedBreed?.coat ?? manualCoat;

  return (
    <form action={action} className="space-y-5">
      {defaultValues?.petId && (
        <input type="hidden" name="petId" value={defaultValues.petId} />
      )}
      <input type="hidden" name="coat" value={coat} />

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="name">
          Pet&apos;s name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name}
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      </div>

      <div>
        <span className="text-sm font-medium text-foreground">Species</span>
        <div className="mt-2 flex gap-2">
          {(["dog", "cat"] as Species[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpecies(s)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                species === s
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-card text-foreground/80 hover:border-accent-dark"
              }`}
            >
              {s === "dog" ? "Dog" : "Cat"}
            </button>
          ))}
        </div>
        <input type="hidden" name="species" value={species} />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="breed">
          Breed
        </label>
        <input
          id="breed"
          name="breed"
          type="text"
          list="breed-options"
          required
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          placeholder="Start typing a breed…"
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
        <datalist id="breed-options">
          {breedOptions.map((b) => (
            <option key={b.name} value={b.name} />
          ))}
        </datalist>
        {breed.trim() && !matchedBreed && (
          <div className="mt-3">
            <p className="text-xs text-muted">
              We don&apos;t recognize that breed — pick the closest coat
              type:
            </p>
            <div className="mt-2 flex gap-2">
              {(["short", "long"] as CoatLength[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setManualCoat(c)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    manualCoat === c
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-card text-foreground/80 hover:border-accent-dark"
                  }`}
                >
                  {c === "short" ? "Short / smooth coat" : "Long or curly coat"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="weightLb">
          Weight (lb)
        </label>
        <input
          id="weightLb"
          name="weightLb"
          type="number"
          min={1}
          step={1}
          required
          defaultValue={defaultValues?.weightLb}
          className="mt-2 w-40 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      </div>

      {species === "dog" && (
        <div>
          <span className="text-sm font-medium text-foreground">
            Date of birth{" "}
            <span className="font-normal text-muted">(if known)</span>
          </span>
          <BirthdatePicker value={birthDate} onChange={setBirthDate} />
          <input type="hidden" name="birthDate" value={birthDate} />
          <p className="mt-1.5 px-1 text-xs text-muted">
            {isPuppy
              ? "🐶 Under 6 months — this pet will be booked with puppy pricing and the Puppy Intro to Grooming option."
              : "Under 6 months automatically unlocks puppy pricing and the Puppy Intro to Grooming option at booking."}
          </p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="color">
          Color
        </label>
        <input
          id="color"
          name="color"
          type="text"
          defaultValue={defaultValues?.color}
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      </div>

      <div>
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="healthConcerns"
        >
          Health concerns{" "}
          <span className="font-normal text-muted">(if any)</span>
        </label>
        <textarea
          id="healthConcerns"
          name="healthConcerns"
          rows={3}
          defaultValue={defaultValues?.healthConcerns}
          placeholder="Anxiety, joint issues, allergies, sensitive skin…"
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      </div>

      <button
        type="submit"
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
      >
        {submitLabel}
      </button>
    </form>
  );
}
