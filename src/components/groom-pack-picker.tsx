"use client";

import { useEffect, useState } from "react";
import {
  applyMemberAddonDiscount,
  calculateDogPrice,
  calculateSalesTax,
  SALES_TAX_PERCENT,
  dogAddOns,
  GROOM_PACK_SERVICE_LABELS,
  GROOM_PACK_SERVICES,
  GROOM_PACK_TIER_LABELS,
  memberPackagePrices,
  PACKAGE_DESCRIPTIONS,
  PACKAGE_LABELS,
  type GroomPackService,
  type GroomPackTier,
  type PackageTier,
  type PricingConfig,
} from "@/lib/pricing/pricing";
import { getPetMembershipStatus } from "@/app/book/actions";
import { isDoodleMixBreed, type CoatLength } from "@/lib/pricing/breeds";

interface Pet {
  id: string;
  name: string;
  breed: string;
  weight_lb: number;
  coat: CoatLength;
  is_puppy?: boolean;
}

const TIERS: GroomPackTier[] = ["five", "nine"];
const BUNDLE_TIERS: PackageTier[] = ["freshStart", "pampered", "vip"];

export default function GroomPackPicker({
  pets,
  action,
  config,
}: {
  pets: Pet[];
  action: (formData: FormData) => void;
  config: PricingConfig;
}) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [service, setService] = useState<GroomPackService>("bath");
  const [tier, setTier] = useState<GroomPackTier>("five");
  const [packageTier, setPackageTier] = useState<PackageTier | "none">("none");
  const [addonNames, setAddonNames] = useState<string[]>([]);
  const [hasMembership, setHasMembership] = useState(false);

  const pet = pets.find((p) => p.id === petId) ?? pets[0];

  useEffect(() => {
    if (!pet?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the member discount preview when no pet is selected
      setHasMembership(false);
      return;
    }
    let cancelled = false;
    getPetMembershipStatus(pet.id).then((result) => {
      if (!cancelled) setHasMembership(result);
    });
    return () => {
      cancelled = true;
    };
  }, [pet?.id]);

  if (pets.length === 0) {
    return (
      <p className="text-sm text-muted">
        No dogs available to buy a pack for. Add a dog to the pet profile
        first.
      </p>
    );
  }

  function toggleAddonName(name: string) {
    setAddonNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  const addonPrice = (price: number) =>
    hasMembership ? applyMemberAddonDiscount(price, config) : price;

  const unitPrice = calculateDogPrice(
    {
      weightLb: pet.weight_lb,
      coat: pet.coat,
      service,
      isPuppy: pet.is_puppy ?? false,
      deshed: false,
      isDoodleMix: isDoodleMixBreed(pet.breed),
    },
    config,
  ).total;

  const memberPackages = memberPackagePrices(config);
  const { paidCount, freeCount } = config.groomPacks[tier];
  const totalCredits = paidCount + freeCount;
  const packPrice = unitPrice * paidCount;
  const bundlePrice =
    packageTier !== "none"
      ? hasMembership
        ? memberPackages[packageTier]
        : config.packages[packageTier]
      : 0;
  const addonsTotal = dogAddOns(config)
    .filter((a) => addonNames.includes(a.name))
    .reduce((sum, a) => sum + addonPrice(a.price), 0);
  const totalPrice = packPrice + bundlePrice + addonsTotal;
  const salesTax = calculateSalesTax(totalPrice);
  const grandTotal = totalPrice + salesTax;
  const perVisitAverage = Math.round((packPrice / totalCredits) * 100) / 100;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="petId" value={petId} />
      <input type="hidden" name="service" value={service} />
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="addonBundle" value={packageTier} />
      <input type="hidden" name="addonNames" value={JSON.stringify(addonNames)} />

      {pets.length > 1 && (
        <div>
          <label className="text-sm font-medium text-foreground">Dog</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {pets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPetId(p.id)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  petId === p.id
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-card text-foreground/80 hover:border-accent-dark"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground">Service</label>
        <div className="mt-2 flex gap-2">
          {GROOM_PACK_SERVICES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setService(s)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                service === s
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-card text-foreground/80 hover:border-accent-dark"
              }`}
            >
              {GROOM_PACK_SERVICE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Pack</label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {TIERS.map((t) => {
            const info = config.groomPacks[t];
            const price = unitPrice * info.paidCount;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  tier === t
                    ? "border-accent bg-accent-tint"
                    : "border-border bg-card hover:border-accent-dark"
                }`}
              >
                <p className="font-serif text-base text-foreground">
                  {GROOM_PACK_TIER_LABELS[t]}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {info.paidCount + info.freeCount} total{" "}
                  {GROOM_PACK_SERVICE_LABELS[service]} visits for {pet.name}
                </p>
                <p className="mt-2 text-sm font-medium text-accent-dark">
                  ${price}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Add a bundle{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPackageTier("none")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              packageTier === "none"
                ? "border-accent bg-accent-tint"
                : "border-border bg-card hover:border-accent-dark"
            }`}
          >
            <p className="font-serif text-base text-foreground">None</p>
            <p className="mt-1 text-xs text-muted">
              Just the pack. Add bundles later if you change your mind.
            </p>
          </button>
          {BUNDLE_TIERS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setPackageTier(b)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                packageTier === b
                  ? "border-accent bg-accent-tint"
                  : "border-border bg-card hover:border-accent-dark"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-serif text-base text-foreground">
                  {PACKAGE_LABELS[b]}
                </p>
                <span className="shrink-0 text-sm font-medium text-accent-dark">
                  ${hasMembership ? memberPackages[b] : config.packages[b]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {PACKAGE_DESCRIPTIONS[b]}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Add individual add-ons{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[...dogAddOns(config)].sort((a, b) => a.price - b.price).map((addOn) => (
            <label
              key={addOn.name}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground/90"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={addonNames.includes(addOn.name)}
                  onChange={() => toggleAddonName(addOn.name)}
                  className="h-4 w-4 rounded border-border accent-accent"
                />
                {addOn.name}
              </span>
              <span className="shrink-0 text-xs">
                {hasMembership ? (
                  <>
                    <span className="text-muted line-through">
                      ${addOn.price}
                    </span>{" "}
                    <span className="font-medium text-accent-dark">
                      ${addonPrice(addOn.price)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted">${addOn.price}</span>
                )}
              </span>
            </label>
          ))}
        </div>
        {hasMembership && (
          <p className="mt-1.5 px-1 text-xs font-medium text-accent-dark">
            Member pricing applied.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-accent-tint p-6">
        <div className="flex items-baseline justify-between text-sm text-foreground/80">
          <span>Subtotal</span>
          <span>${totalPrice}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-sm text-foreground/80">
          <span>Sales tax ({SALES_TAX_PERCENT}%)</span>
          <span>${salesTax}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-border/60 pt-2">
          <span className="font-serif text-lg text-foreground">
            Total due
          </span>
          <span className="font-serif text-3xl text-accent-dark">
            ${grandTotal}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">
          {totalCredits} {GROOM_PACK_SERVICE_LABELS[service]} visits for{" "}
          {pet.name}, about ${perVisitAverage}{" "}
          each, plus any bundle or add-ons above. Credits never expire.
        </p>
      </div>

      <button
        type="submit"
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
      >
        Buy Pack
      </button>
    </form>
  );
}
