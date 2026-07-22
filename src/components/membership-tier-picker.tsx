"use client";

import { useState } from "react";
import {
  applyMembershipDiscount,
  calculateDogPrice,
  MEMBER_PACKAGE_PRICES,
  MEMBERSHIP_FREE_MONTH_THRESHOLD,
  MEMBERSHIP_GROOM_DISCOUNT,
  MEMBERSHIP_TIER_LABELS,
  MEMBERSHIP_TIER_SERVICE,
  PACKAGE_DESCRIPTIONS,
  PACKAGE_LABELS,
  type MembershipTier,
  type PackageTier,
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
}: {
  pets: Pet[];
  action: (formData: FormData) => void;
  hiddenFields?: Record<string, string>;
  submitLabel?: string;
}) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [tier, setTier] = useState<MembershipTier>("spaPup");
  const [addonBundle, setAddonBundle] = useState<PackageTier | "none">("none");
  // Memberships are billed automatically each month, so online payment only.
  const paymentMethod = "online" as const;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pet = pets.find((p) => p.id === petId) ?? pets[0];

  if (pets.length === 0) {
    return (
      <p className="text-sm text-muted">
        No dogs available to enroll — add a dog to the pet profile first.
      </p>
    );
  }

  function monthlyPriceFor(t: MembershipTier) {
    const basePrice = calculateDogPrice({
      weightLb: pet.weight_lb,
      coat: pet.coat,
      service: MEMBERSHIP_TIER_SERVICE[t],
      isPuppy: false,
      isDoodle: false,
      deshed: false,
    }).total;
    return applyMembershipDiscount(basePrice);
  }

  const tierPrice = monthlyPriceFor(tier);
  const bundlePrice = addonBundle !== "none" ? MEMBER_PACKAGE_PRICES[addonBundle] : 0;
  const total = tierPrice + bundlePrice;

  return (
    <form action={action} className="space-y-6">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <input type="hidden" name="petId" value={petId} />
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="addonBundle" value={addonBundle} />
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
                <li>• {MEMBERSHIP_GROOM_DISCOUNT * 100}% off every groom</li>
                <li>• Priority booking</li>
                <li>• Discounted add-on bundles</li>
                <li>
                  • Free groom every {MEMBERSHIP_FREE_MONTH_THRESHOLD[t]}{" "}
                  months
                </li>
              </ul>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {`Priced for ${pet.name} at today's rates — already includes your ${MEMBERSHIP_GROOM_DISCOUNT * 100}% member discount off the regular weight/coat pricing.`}
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Equip a discounted add-on bundle{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
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
              Just the groom — add bundles later if you change your mind.
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
                  ${MEMBER_PACKAGE_PRICES[b]}/mo
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
          Payment
        </label>
        <p className="mt-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground/90">
          Pay online — memberships are billed automatically each month.
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
