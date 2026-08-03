"use client";

import { useState } from "react";
import {
  applyMemberAddonDiscount,
  calculateDogPrice,
  dogAddOns,
  memberPackagePrices,
  MEMBERSHIP_TIER_LABELS,
  MEMBERSHIP_TIER_SERVICE,
  PACKAGE_DESCRIPTIONS,
  PACKAGE_LABELS,
  type MembershipTier,
  type PackageTier,
  type PricingConfig,
} from "@/lib/pricing/pricing";
import type { CoatLength } from "@/lib/pricing/breeds";

interface Pet {
  id: string;
  name: string;
  breed: string;
  weight_lb: number;
  coat: CoatLength;
}

const TIERS: MembershipTier[] = ["spaPup", "royalPup", "couturePup"];
const BUNDLE_TIERS: PackageTier[] = ["freshStart", "pampered", "vip"];

export default function MembershipTierPicker({
  pets,
  action,
  hiddenFields,
  submitLabel = "Join Membership",
  config,
}: {
  pets: Pet[];
  action: (formData: FormData) => void;
  hiddenFields?: Record<string, string>;
  submitLabel?: string;
  config: PricingConfig;
}) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [tier, setTier] = useState<MembershipTier>("spaPup");
  const [addonBundle, setAddonBundle] = useState<PackageTier | "none">("none");
  const [addonNames, setAddonNames] = useState<string[]>([]);
  // Memberships are billed automatically each month, so online payment only.
  const paymentMethod = "online" as const;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pet = pets.find((p) => p.id === petId) ?? pets[0];

  if (pets.length === 0) {
    return (
      <p className="text-sm text-muted">
        No dogs available to enroll. Add a dog to the pet profile first.
      </p>
    );
  }

  function monthlyPriceFor(t: MembershipTier) {
    return calculateDogPrice(
      {
        weightLb: pet.weight_lb,
        coat: pet.coat,
        service: MEMBERSHIP_TIER_SERVICE[t],
        isPuppy: false,
        deshed: false,
      },
      config,
    ).total;
  }

  function toggleAddonName(name: string) {
    setAddonNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  const memberPackages = memberPackagePrices(config);
  const tierPrice = monthlyPriceFor(tier);
  const bundlePrice = addonBundle !== "none" ? memberPackages[addonBundle] : 0;
  const addonNamesTotal = dogAddOns(config)
    .filter((a) => addonNames.includes(a.name))
    .reduce((sum, a) => sum + applyMemberAddonDiscount(a.price, config), 0);
  const total = tierPrice + bundlePrice + addonNamesTotal;

  return (
    <form action={action} className="space-y-6">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <input type="hidden" name="petId" value={petId} />
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="addonBundle" value={addonBundle} />
      <input type="hidden" name="addonNames" value={JSON.stringify(addonNames)} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

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
        <label className="text-sm font-medium text-foreground">Tier</label>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {TIERS.map((t) => (
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
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-serif text-base text-foreground">
                  {MEMBERSHIP_TIER_LABELS[t]}
                </p>
                <span className="shrink-0 text-sm font-medium text-accent-dark">
                  ${monthlyPriceFor(t)}/mo
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted">
                <li>• Priority booking</li>
                <li>
                  • {config.memberAddonDiscountPercent}% off individual
                  add-ons
                </li>
                <li>
                  • {config.memberAddonDiscountPercent}% off add-on
                  bundles
                </li>
              </ul>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {`Priced for ${pet.name} at today's normal rate for this service, same as booking à la carte. Membership doesn't change the groom price — it unlocks priority booking plus discounted add-ons and bundles.`}
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Equip a discounted add-on bundle{" "}
          <span className="font-normal text-muted">
            ({config.memberAddonDiscountPercent}% off, optional)
          </span>
        </label>
        <p className="mt-1 text-xs text-muted">
          These are also offered as individual add-ons. Layer any of them
          onto a core service to tailor the visit.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setAddonBundle("none")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              addonBundle === "none"
                ? "border-accent bg-accent-tint"
                : "border-border bg-card hover:border-accent-dark"
            }`}
          >
            <p className="font-serif text-base text-foreground">None</p>
            <p className="mt-1 text-xs text-muted">
              Just the groom. Add bundles later if you change your mind.
            </p>
          </button>
          {BUNDLE_TIERS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setAddonBundle(b)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                addonBundle === b
                  ? "border-accent bg-accent-tint"
                  : "border-border bg-card hover:border-accent-dark"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-serif text-base text-foreground">
                  {PACKAGE_LABELS[b]}
                </p>
                <span className="shrink-0 text-sm font-medium text-accent-dark">
                  ${memberPackages[b]}/mo
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
        <p className="mt-1 text-xs text-muted">
          Pick any number of individual add-ons to include with your
          membership every month, each at your member discount.
        </p>
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
                <span className="text-muted line-through">
                  ${addOn.price}
                </span>{" "}
                <span className="font-medium text-accent-dark">
                  ${applyMemberAddonDiscount(addOn.price, config)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Payment
        </label>
        <p className="mt-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground/90">
          Pay online. Memberships are billed automatically each month.
        </p>
      </div>

      <div className="rounded-2xl bg-accent-tint p-6">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-lg text-foreground">
            Due today
          </span>
          <span className="font-serif text-3xl text-accent-dark">
            ${total}
            <span className="text-sm font-normal text-muted">/mo</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
      >
        {submitLabel}
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-foreground">
              Confirm membership
            </p>
            <div className="mt-4 space-y-1 text-sm text-foreground/90">
              <div className="flex justify-between">
                <span>{pet.name}</span>
                <span>{MEMBERSHIP_TIER_LABELS[tier]}</span>
              </div>
              {addonBundle !== "none" && (
                <div className="flex justify-between text-muted">
                  <span>Bundle</span>
                  <span>{PACKAGE_LABELS[addonBundle]}</span>
                </div>
              )}
              {addonNames.length > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Add-ons</span>
                  <span>{addonNames.join(", ")}</span>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <span>Payment</span>
                <span>
                  {paymentMethod === "online"
                    ? "Online now"
                    : "In person (Square)"}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 font-medium">
                <span>Due today</span>
                <span>${total}/mo</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark"
              >
                Go back
              </button>
              <button
                type="submit"
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Confirm &amp; {submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
