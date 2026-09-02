"use client";

import { useMemo, useState } from "react";
import {
  DOG_BREEDS,
  CAT_BREEDS,
  findBreed,
  findCatBreed,
  isDoodleMixBreed,
  isMinimalCoatDiscountBreed,
  type CoatLength,
} from "@/lib/pricing/breeds";
import {
  calculateDogPrice,
  calculateCatPrice,
  calculateSalesTax,
  dogAddOns,
  catAddOns,
  DOG_ADD_ONS_INCLUDED_WITH_SERVICE,
  CAT_ADD_ONS_INCLUDED_WITH_SERVICE,
  DOG_SERVICE_LABELS,
  DOG_SERVICE_DESCRIPTIONS,
  CAT_SERVICE_LABELS,
  CAT_SERVICE_DESCRIPTIONS,
  SALES_TAX_PERCENT,
  PACKAGE_LABELS,
  PACKAGE_DESCRIPTIONS,
  type DogBookingService,
  type CatServiceLevel,
  type PackageTier,
  type PricingConfig,
} from "@/lib/pricing/pricing";
import { BUSINESS_NAME } from "@/lib/notifications/templates";
import { lookupCouponCodeForQuote } from "@/lib/coupons/actions";

type Species = "dog" | "cat";

const DOG_SERVICES: DogBookingService[] = ["bath", "trim", "haircut"];
const CAT_SERVICES: CatServiceLevel[] = ["bath", "lightTrim", "fleaBath", "fleaBathTidy"];

function PillGroup<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
            value === opt
              ? "border-accent bg-accent text-white"
              : "border-border bg-card text-foreground/80 hover:border-accent-dark"
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export default function QuickQuoteTool({ config }: { config: PricingConfig }) {
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [isMixed, setIsMixed] = useState(false);
  const [manualCoat, setManualCoat] = useState<CoatLength>("short");
  const [isPuppy, setIsPuppy] = useState(false);
  const [isKitten, setIsKitten] = useState(false);
  const [waterless, setWaterless] = useState(false);
  const [weightLb, setWeightLb] = useState("");
  const [dogService, setDogService] = useState<DogBookingService>("bath");
  const [catService, setCatService] = useState<CatServiceLevel>("bath");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [deshed, setDeshed] = useState(false);
  const [packageTier, setPackageTier] = useState<PackageTier | "none">("none");
  const [pickupDropoff, setPickupDropoff] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponCodeError, setCouponCodeError] = useState<string | null>(null);
  const [couponCodeSubmitting, setCouponCodeSubmitting] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    discountPercent: number | null;
    discountAmount: number | null;
  } | null>(null);

  // Preview-only — never redeems/burns the code, since there's no real
  // customer attached to a quick quote.
  async function handleApplyCouponCode() {
    if (!couponCodeInput.trim()) return;
    setCouponCodeSubmitting(true);
    setCouponCodeError(null);
    const result = await lookupCouponCodeForQuote(couponCodeInput);
    setCouponCodeSubmitting(false);
    if (!result.success) {
      setCouponCodeError(result.error ?? "That code isn't valid.");
      return;
    }
    setAppliedCoupon({
      discountPercent: result.discountPercent ?? null,
      discountAmount: result.discountAmount ?? null,
    });
  }

  function clearAppliedCoupon() {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setCouponCodeError(null);
  }

  const breedOptions = species === "dog" ? DOG_BREEDS : CAT_BREEDS;
  const matchedBreed = useMemo(
    () =>
      isMixed
        ? undefined
        : species === "dog"
          ? findBreed(breed.trim())
          : findCatBreed(breed.trim()),
    [species, breed, isMixed],
  );
  const coat = matchedBreed?.coat ?? manualCoat;
  const fullBreedName = isMixed && breed.trim() ? `${breed.trim()} Mix` : breed.trim();

  const weight = Number(weightLb);
  const hasWeight = weightLb.trim() !== "" && weight > 0;

  const dogServiceOptions: DogBookingService[] = isPuppy
    ? [...DOG_SERVICES, "puppyIntro"]
    : DOG_SERVICES;

  // Only actually apply the waterless checkbox where it's shown (kitten
  // bath/lightTrim) — guards against a stale `true` leaking into an
  // ineligible combination (adult cat, flea services) after switching.
  const waterlessEligible =
    species === "cat" && isKitten && (catService === "bath" || catService === "lightTrim");
  const effectiveWaterless = waterlessEligible && waterless;

  const result = useMemo(() => {
    if (!hasWeight) return null;
    if (species === "dog") {
      return calculateDogPrice(
        {
          weightLb: weight,
          coat,
          service: dogService,
          isPuppy,
          deshed,
          isDoodleMix: isDoodleMixBreed(fullBreedName),
          isMinimalCoatBreed: isMinimalCoatDiscountBreed(fullBreedName),
        },
        config,
      );
    }
    return calculateCatPrice(
      {
        weightLb: weight,
        coat,
        service: catService,
        waterless: effectiveWaterless,
        deshed,
        isKitten,
      },
      config,
    );
  }, [
    species,
    weight,
    hasWeight,
    coat,
    dogService,
    catService,
    isPuppy,
    isKitten,
    effectiveWaterless,
    fullBreedName,
    deshed,
    config,
  ]);

  // Already included free with the selected service (ear cleaning, nail
  // trim, etc.) — same rule the real booking flow uses — so they never show
  // as a paid add-on choice here either.
  const includedWithService =
    species === "dog" ? DOG_ADD_ONS_INCLUDED_WITH_SERVICE : CAT_ADD_ONS_INCLUDED_WITH_SERVICE;
  const addOnCatalog = [...(species === "dog" ? dogAddOns(config) : catAddOns(config))]
    .filter((a) => !includedWithService.includes(a.name))
    .sort((a, b) => a.price - b.price);
  const addOnsTotal = addOnCatalog
    .filter((a) => selectedAddOns.includes(a.name))
    .reduce((sum, a) => sum + a.price, 0);

  const packagePrice = packageTier !== "none" ? config.packages[packageTier] : 0;
  const pickupDropoffFee = pickupDropoff ? config.flatFees.pickupDropoff : 0;

  // Same scope real coupons use — the groom + add-ons + package, never the
  // pickup & drop-off flat fee.
  const groomSubtotal = (result?.total ?? 0) + addOnsTotal + packagePrice;
  const couponSavings = appliedCoupon
    ? appliedCoupon.discountPercent
      ? Math.round(groomSubtotal * (appliedCoupon.discountPercent / 100) * 100) / 100
      : (appliedCoupon.discountAmount ?? 0)
    : 0;

  const subtotal =
    Math.max(0, groomSubtotal - couponSavings) + pickupDropoffFee;
  const salesTax = calculateSalesTax(subtotal);
  const total = subtotal + salesTax;

  function toggleAddOn(name: string) {
    setSelectedAddOns((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  const serviceLabel =
    species === "dog" ? DOG_SERVICE_LABELS[dogService] : CAT_SERVICE_LABELS[catService];
  const serviceDescription =
    species === "dog"
      ? DOG_SERVICE_DESCRIPTIONS[dogService]
      : CAT_SERVICE_DESCRIPTIONS[catService];

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm font-medium text-foreground">Species</span>
        <div className="mt-2 flex gap-2">
          {(["dog", "cat"] as Species[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSpecies(s);
                setDogService("bath");
                setCatService("bath");
                setSelectedAddOns([]);
                if (s === "cat") setIsPuppy(false);
                if (s === "dog") setIsKitten(false);
              }}
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
      </div>

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="quote-breed">
          Breed <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="quote-breed"
          type="text"
          list="quote-breed-options"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          placeholder="Start typing a breed…"
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
        <datalist id="quote-breed-options">
          {breedOptions.map((b) => (
            <option key={b.name} value={b.name} />
          ))}
        </datalist>
        <label className="mt-2 flex items-center gap-2 text-sm text-foreground/90">
          <input
            type="checkbox"
            checked={isMixed}
            onChange={(e) => setIsMixed(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Mixed breed
        </label>
        {breed.trim() && !matchedBreed && (
          <div className="mt-3">
            <p className="text-xs text-muted">Pick the closest coat type:</p>
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
        <label className="text-sm font-medium text-foreground" htmlFor="quote-weight">
          Weight (lb)
        </label>
        <input
          id="quote-weight"
          type="number"
          min={1}
          step={1}
          value={weightLb}
          onChange={(e) => setWeightLb(e.target.value)}
          className="mt-2 w-40 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      </div>

      {species === "dog" && (
        <div>
          <span className="text-sm font-medium text-foreground">Age</span>
          <div className="mt-2 flex gap-2">
            {(
              [
                { value: false, label: "Adult" },
                { value: true, label: "Puppy" },
              ] as const
            ).map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  setIsPuppy(opt.value);
                  if (!opt.value && dogService === "puppyIntro") setDogService("bath");
                }}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  isPuppy === opt.value
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-card text-foreground/80 hover:border-accent-dark"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {species === "cat" && (
        <div>
          <span className="text-sm font-medium text-foreground">Age</span>
          <div className="mt-2 flex gap-2">
            {(
              [
                { value: false, label: "Adult" },
                { value: true, label: "Kitten" },
              ] as const
            ).map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setIsKitten(opt.value)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  isKitten === opt.value
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-card text-foreground/80 hover:border-accent-dark"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="text-sm font-medium text-foreground">Service</span>
        <div className="mt-2">
          {species === "dog" ? (
            <PillGroup
              options={dogServiceOptions}
              labels={DOG_SERVICE_LABELS}
              value={dogService}
              onChange={setDogService}
            />
          ) : (
            <PillGroup
              options={CAT_SERVICES}
              labels={CAT_SERVICE_LABELS}
              value={catService}
              onChange={setCatService}
            />
          )}
        </div>
        {waterlessEligible && (
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={waterless}
              onChange={(e) => setWaterless(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            Waterless bath
          </label>
        )}
        <label className="mt-3 flex items-center gap-2 text-sm text-foreground/90">
          <input
            type="checkbox"
            checked={deshed}
            onChange={(e) => setDeshed(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          De-shed treatment (${config.flatFees.deshed})
        </label>
      </div>

      <div>
        <span className="text-sm font-medium text-foreground">
          Package <span className="font-normal text-muted">(optional)</span>
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPackageTier("none")}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              packageTier === "none"
                ? "border-accent bg-accent text-white"
                : "border-border bg-card text-foreground/80 hover:border-accent-dark"
            }`}
          >
            None
          </button>
          {(Object.keys(PACKAGE_LABELS) as PackageTier[]).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setPackageTier(tier)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                packageTier === tier
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-card text-foreground/80 hover:border-accent-dark"
              }`}
            >
              {PACKAGE_LABELS[tier]} (${config.packages[tier]})
            </button>
          ))}
        </div>
        {packageTier !== "none" && (
          <p className="mt-2 text-xs text-muted">
            {PACKAGE_DESCRIPTIONS[packageTier]}
          </p>
        )}
      </div>

      <label className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground/90">
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pickupDropoff}
            onChange={(e) => setPickupDropoff(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Pickup &amp; drop-off
        </span>
        <span className="shrink-0 text-xs text-muted">
          ${config.flatFees.pickupDropoff}
        </span>
      </label>

      <div>
        <span className="text-sm font-medium text-foreground">
          Add-ons <span className="font-normal text-muted">(optional)</span>
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {addOnCatalog.map((addOn) => (
            <label
              key={addOn.name}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground/90"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedAddOns.includes(addOn.name)}
                  onChange={() => toggleAddOn(addOn.name)}
                  className="h-4 w-4 rounded border-border accent-accent"
                />
                {addOn.name}
              </span>
              <span className="shrink-0 text-xs text-muted">${addOn.price}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium text-foreground">
          Coupon code <span className="font-normal text-muted">(optional)</span>
        </span>
        {appliedCoupon ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-accent-dark/40 bg-accent-tint px-3.5 py-2.5 text-sm text-foreground/90">
            <span>
              {appliedCoupon.discountPercent
                ? `${appliedCoupon.discountPercent}% off applied`
                : `$${appliedCoupon.discountAmount} off applied`}
            </span>
            <button
              type="button"
              onClick={clearAppliedCoupon}
              className="text-xs text-accent-dark hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={couponCodeInput}
              onChange={(e) => {
                setCouponCodeInput(e.target.value);
                setCouponCodeError(null);
              }}
              placeholder="Enter code"
              className="w-36 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground uppercase outline-none focus:border-accent-dark"
            />
            <button
              type="button"
              onClick={handleApplyCouponCode}
              disabled={couponCodeSubmitting || !couponCodeInput.trim()}
              className="rounded-full border border-accent-dark px-4 py-2 text-sm font-medium text-accent-dark transition-colors hover:bg-accent-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {couponCodeSubmitting ? "Checking…" : "Apply"}
            </button>
          </div>
        )}
        {couponCodeError && (
          <p className="mt-2 text-xs text-accent-dark">{couponCodeError}</p>
        )}
        <p className="mt-1 text-xs text-muted">
          Only checks shared/promo codes (like the site banner) — a
          customer&apos;s own personal coupon isn&apos;t a typed code, so it
          won&apos;t look up here.
        </p>
      </div>

      {result ? (
        <div className="rounded-2xl border-2 border-accent bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-accent-dark">
            {BUSINESS_NAME}
          </p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">{serviceLabel}</h2>
          <p className="mt-1 text-sm text-muted">
            {fullBreedName || (species === "dog" ? "Dog" : "Cat")} · {weightLb} lb
            {species === "dog"
              ? ` · ${isPuppy ? "Puppy" : "Adult"}`
              : ` · ${isKitten ? "Kitten" : "Adult"}`}
          </p>
          <p className="mt-4 font-serif text-4xl text-accent-dark">
            ${total.toFixed(2).replace(/\.00$/, "")}
          </p>
          <p className="mt-1 text-xs text-muted">
            ${subtotal.toFixed(2).replace(/\.00$/, "")} + ${salesTax.toFixed(2)} sales tax ({SALES_TAX_PERCENT}%)
          </p>
          {couponSavings > 0 && (
            <div className="mt-3 rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-medium text-white">
              🎁 Coupon applied — saving ${couponSavings.toFixed(2)}
            </div>
          )}
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Includes
            </p>
            <p className="mt-1 text-sm text-foreground/90">{serviceDescription}</p>
            {(deshed ||
              packageTier !== "none" ||
              pickupDropoff ||
              selectedAddOns.length > 0) && (
              <ul className="mt-2 space-y-0.5 text-sm text-foreground/90">
                {deshed && <li>+ De-shed treatment (${config.flatFees.deshed})</li>}
                {packageTier !== "none" && (
                  <li>
                    + {PACKAGE_LABELS[packageTier]} (${config.packages[packageTier]})
                  </li>
                )}
                {addOnCatalog
                  .filter((a) => selectedAddOns.includes(a.name))
                  .map((a) => (
                    <li key={a.name}>
                      + {a.name} (${a.price})
                    </li>
                  ))}
                {pickupDropoff && (
                  <li>+ Pickup &amp; drop-off (${config.flatFees.pickupDropoff})</li>
                )}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Enter a weight to see the quote.</p>
      )}
    </div>
  );
}
