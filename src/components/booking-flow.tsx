"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateCatPrice,
  calculateCreativePrice,
  calculateDogPrice,
  applyMemberAddonDiscount,
  catAddOns,
  CAT_ADD_ONS_INCLUDED_WITH_SERVICE,
  CAT_SERVICE_DESCRIPTIONS,
  CAT_SERVICE_LABELS,
  dogAddOns,
  DOG_ADD_ONS_INCLUDED_WITH_SERVICE,
  DOG_SERVICE_DESCRIPTIONS,
  DOG_SERVICE_LABELS,
  memberPackagePrices,
  PACKAGE_DESCRIPTIONS,
  PACKAGE_LABELS,
  applyDiscount,
  calculateSalesTax,
  SALES_TAX_PERCENT,
  monthsSince,
  type CatServiceLevel,
  type CreativeTier,
  type DogBookingService,
  type PackageTier,
  type PricingConfig,
} from "@/lib/pricing/pricing";
import {
  getBookedHours,
  getUnavailableDates,
  createAppointment,
  updateAppointment,
  checkPickupAddress,
  getPetMembershipStatus,
  getAvailableGroomCredits,
} from "@/app/book/actions";
import { getActivePromotion, type ActivePromotion } from "@/lib/promotions/actions";
import { promotionAppliesToDate } from "@/lib/promotions/helpers";
import { getCustomerCoupon, redeemCouponCode } from "@/lib/coupons/actions";
import { logBookingStep } from "@/lib/analytics/booking-funnel";
import {
  ADMIN_EXTRA_HOURS,
  BOOKING_HOURS as HOURS,
  PICKUP_MIN_LEAD_HOURS,
} from "@/lib/booking-hours";
import { centralWallClockToInstant, formatHour } from "@/lib/format";
import { isDoodleMixBreed, type CoatLength } from "@/lib/pricing/breeds";
import DatePickerCalendar from "@/components/date-picker-calendar";
import PawIcon from "@/components/paw-icon";
import WaiverSection, {
  isWaiverValid,
  WAIVER_DEFAULTS,
  type WaiverState,
} from "@/components/waiver-section";

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

export interface BookingInitialValues {
  service: string;
  deshed: boolean;
  creativeTier: CreativeTier | "none";
  addOnNames?: string[];
  packageTier?: PackageTier | "none";
  date: string;
  hour: number;
  minute?: number;
  paymentMethod: "online" | "in_person";
  customerNote?: string;
  standalone?: boolean;
  pickupDropoff?: boolean;
  pickupAddress?: string;
  promoDiscountPercent?: number | null;
}


function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function isPastOrTooSoon(
  date: string,
  hour: number,
  pickupDropoff: boolean,
): boolean {
  // Appointment hours are always Central wall-clock time (the business's
  // own timezone) — building this without pinning a timezone would parse
  // it using the *visitor's own* local clock, wrongly disabling valid
  // buttons for anyone browsing from outside Central time.
  const apptTime = centralWallClockToInstant(date, hour);
  const now = new Date();
  if (apptTime.getTime() <= now.getTime()) return true;
  if (pickupDropoff) {
    const minLeadMs = PICKUP_MIN_LEAD_HOURS * 60 * 60 * 1000;
    if (apptTime.getTime() - now.getTime() < minLeadMs) return true;
  }
  return false;
}

function daysSinceBirth(birthDate: string) {
  const then = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled || opt.disabled}
          onClick={() => onChange(opt.value)}
          className={`rounded-full border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            value === opt.value
              ? "border-accent bg-accent text-white"
              : "border-border bg-card text-foreground/80 hover:border-accent-dark"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function BookingFlow({
  pets,
  mode = "create",
  appointmentId,
  initial,
  action,
  hiddenFields,
  allowOnlinePayment = true,
  isAdmin = false,
  config,
  customerId,
}: {
  pets: Pet[];
  mode?: "create" | "edit";
  appointmentId?: string;
  initial?: BookingInitialValues;
  action?: (formData: FormData) => void;
  hiddenFields?: Record<string, string>;
  allowOnlinePayment?: boolean;
  isAdmin?: boolean;
  config: PricingConfig;
  customerId?: string;
}) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const pet = pets.find((p) => p.id === petId) ?? pets[0];
  const tooYoungToBook =
    pet?.species === "dog" &&
    !!pet.birth_date &&
    daysSinceBirth(pet.birth_date) < 56;
  const [showTooYoungModal, setShowTooYoungModal] = useState(tooYoungToBook);
  const puppyVaccineExempt =
    pet?.species === "dog" && !!pet.birth_date && monthsSince(pet.birth_date) < 4;
  const missingVaccine =
    !!pet && !pet.rabies_vaccine_path && !puppyVaccineExempt;

  const initialIsDogService = pet?.species === "dog";
  const [dogService, setDogService] = useState<DogBookingService>(
    (initialIsDogService && (initial?.service as DogBookingService)) ||
      "haircut",
  );
  const [catService, setCatService] = useState<CatServiceLevel>(
    (!initialIsDogService && (initial?.service as CatServiceLevel)) || "bath",
  );
  const [deshed, setDeshed] = useState(initial?.deshed ?? false);
  const [creativeTier, setCreativeTier] = useState<CreativeTier | "none">(
    initial?.creativeTier ?? "none",
  );
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(
    initial?.addOnNames ?? [],
  );
  const [addOnsOpen, setAddOnsOpen] = useState(false);
  const [packageTier, setPackageTier] = useState<PackageTier | "none">(
    initial?.packageTier ?? "none",
  );
  const [standalone, setStandalone] = useState(initial?.standalone ?? false);

  function toggleStandalone() {
    setStandalone((v) => {
      const next = !v;
      if (next) {
        setDeshed(false);
        setCreativeTier("none");
        setPackageTier("none");
        setAddOnsOpen(true);
      }
      return next;
    });
  }

  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [hour, setHour] = useState<number | null>(initial?.hour ?? null);
  const [minute, setMinute] = useState(initial?.minute ?? 0);
  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [dayBlocked, setDayBlocked] = useState(false);
  const [dayFull, setDayFull] = useState(false);
  const [loadingHours, setLoadingHours] = useState(false);
  const isFirstLoad = useRef(true);

  // Customers must pay online at booking now — no in-person choice. Admin
  // keeps the existing toggle for phone bookings.
  const [paymentMethod, setPaymentMethod] = useState<"online" | "in_person">(
    isAdmin ? (initial?.paymentMethod ?? "in_person") : "online",
  );
  const [customerNote, setCustomerNote] = useState(initial?.customerNote ?? "");
  const [pickupDropoff, setPickupDropoff] = useState(
    initial?.pickupDropoff ?? false,
  );
  const [pickupAddress, setPickupAddress] = useState(
    initial?.pickupAddress ?? "",
  );
  const [pickupEligibility, setPickupEligibility] = useState<
    "idle" | "checking" | "eligible" | "ineligible" | "unknown"
  >("idle");
  const [haircutDescription, setHaircutDescription] = useState("");
  const [hasMembership, setHasMembership] = useState(false);
  // Edits preserve whatever promo the appointment already locked in
  // (matching updateAppointment server-side, at that promo's own rate);
  // only a brand-new booking checks for a live, currently-running promotion.
  const [activePromotion, setActivePromotion] = useState<ActivePromotion | null>(
    null,
  );
  // Re-evaluated every render against the currently selected date, since a
  // promotion's "book within N days" rule depends on which date is picked.
  const promoDiscountPercent =
    mode === "edit"
      ? (initial?.promoDiscountPercent ?? null)
      : activePromotion &&
          promotionAppliesToDate(activePromotion.maxAppointmentLeadDays, date)
        ? activePromotion.discountPercent
        : null;
  const promoActive = promoDiscountPercent != null;
  // A personal coupon (admin-assigned) is opt-in, never automatic — the
  // customer chooses to redeem it, same as redeeming a groom pack credit
  // below. When redeemed, it stacks on top of the sitewide promo, if any,
  // matching createAppointment's server-side calculation. Edits never pick
  // up a coupon (it's locked in at original booking time only).
  const [customerCoupon, setCustomerCoupon] = useState<{
    discountPercent: number | null;
    discountAmount: number | null;
  } | null>(null);
  const [applyCoupon, setApplyCoupon] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponCodeError, setCouponCodeError] = useState<string | null>(null);
  const [couponCodeSubmitting, setCouponCodeSubmitting] = useState(false);
  const [couponCodeApplied, setCouponCodeApplied] = useState(false);
  const couponActive = mode === "create" && customerCoupon != null && applyCoupon;
  const couponPercent = couponActive ? (customerCoupon!.discountPercent ?? 0) : 0;
  const couponAmount = couponActive ? (customerCoupon!.discountAmount ?? 0) : 0;

  // Typing a code spawns a personal-coupon row for this customer server-side
  // (see redeemCouponCode) and, on success, is applied the exact same way an
  // admin-assigned coupon already is — same state, same price math below.
  async function handleApplyCouponCode() {
    if (!couponCodeInput.trim()) return;
    setCouponCodeSubmitting(true);
    setCouponCodeError(null);
    const result = await redeemCouponCode(couponCodeInput);
    setCouponCodeSubmitting(false);
    if (!result.success) {
      setCouponCodeError(result.error ?? "Could not apply that code.");
      return;
    }
    setCustomerCoupon({
      discountPercent: result.discountPercent ?? null,
      discountAmount: result.discountAmount ?? null,
    });
    setApplyCoupon(true);
    setCouponCodeApplied(true);
  }
  // Admin bookings don't draw from the sitewide promo or a customer's saved
  // coupon — instead the admin can just type in whatever one-off discount
  // they want for this booking, e.g. to match a phone-quoted price.
  const [adminDiscountType, setAdminDiscountType] = useState<"none" | "percent" | "amount">("none");
  const [adminDiscountValue, setAdminDiscountValue] = useState("");
  const adminDiscountPercent =
    isAdmin && adminDiscountType === "percent" ? Number(adminDiscountValue) || 0 : 0;
  const adminDiscountAmount =
    isAdmin && adminDiscountType === "amount" ? Number(adminDiscountValue) || 0 : 0;
  const flatDiscountAmount = couponAmount + adminDiscountAmount;
  const effectiveDiscountPercent =
    (promoDiscountPercent ?? 0) + couponPercent + adminDiscountPercent || null;
  const [availableCredits, setAvailableCredits] = useState(0);
  const [redeemCredit, setRedeemCredit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [waiver, setWaiver] = useState<WaiverState>(WAIVER_DEFAULTS);
  const updateWaiver = (patch: Partial<WaiverState>) =>
    setWaiver((w) => ({ ...w, ...patch }));
  const waiverValid = mode === "edit" || isWaiverValid(waiver);

  useEffect(() => {
    if (isAdmin || mode === "edit") return;
    let cancelled = false;
    getActivePromotion().then((promo) => {
      if (!cancelled) setActivePromotion(promo);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, mode]);

  useEffect(() => {
    if (isAdmin || mode === "edit" || !customerId) return;
    let cancelled = false;
    getCustomerCoupon(customerId).then((coupon) => {
      if (!cancelled) setCustomerCoupon(coupon);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, mode, customerId]);

  // Only the two checkpoints that aren't already knowable from the
  // appointments table itself — landing on the form, and picking a time —
  // to see where in the flow people actually drop off, without building a
  // full page-view analytics system for a two-step form.
  useEffect(() => {
    if (isAdmin || mode !== "create") return;
    logBookingStep("landed");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per mount only, not on every isAdmin/mode change
  }, []);

  const trackedPickedTime = useRef(false);
  useEffect(() => {
    if (isAdmin || mode !== "create" || hour === null || trackedPickedTime.current) {
      return;
    }
    trackedPickedTime.current = true;
    logBookingStep("picked_time");
  }, [isAdmin, mode, hour]);

  useEffect(() => {
    if (!customerCoupon && applyCoupon) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- un-toggles redemption if the coupon became unavailable out from under an active selection
      setApplyCoupon(false);
    }
  }, [customerCoupon, applyCoupon]);

  useEffect(() => {
    if (tooYoungToBook) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- re-opens the blocking modal whenever the selected pet is too young
      setShowTooYoungModal(true);
    }
  }, [pet?.id, tooYoungToBook]);

  useEffect(() => {
    if (dogService === "puppyIntro" && !pet?.is_puppy) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears an appointment-illegal selection when the picked pet isn't a puppy
      setDogService("haircut");
    }
  }, [pet, dogService]);

  useEffect(() => {
    if (!pet?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the membership discount when no pet is selected
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

  useEffect(() => {
    if (!pet?.id || pet.species !== "dog" || standalone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets available credits when there's no eligible pet/service selected
      setAvailableCredits(0);
      return;
    }
    if (dogService !== "bath" && dogService !== "haircut") {
      setAvailableCredits(0);
      return;
    }
    let cancelled = false;
    getAvailableGroomCredits(pet.id, dogService).then((count) => {
      if (!cancelled) setAvailableCredits(count);
    });
    return () => {
      cancelled = true;
    };
  }, [pet?.id, pet?.species, dogService, standalone]);

  useEffect(() => {
    if (!isAdmin && hour !== null && isPastOrTooSoon(date, hour, pickupDropoff)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears a now-invalid hour when toggling pickup on requires more lead time than the current selection has
      setHour(null);
      setMinute(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupDropoff]);

  useEffect(() => {
    if (availableCredits === 0 && redeemCredit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- un-toggles redemption if the selection changed out from under an active credit choice
      setRedeemCredit(false);
    }
  }, [availableCredits, redeemCredit]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off an async availability fetch when `date` changes
    setLoadingHours(true);
    getBookedHours(date, appointmentId).then((availability) => {
      if (cancelled) return;
      setBookedHours(availability.bookedHours);
      setDayBlocked(availability.dayBlocked);
      setDayFull(availability.dayFull);
      // Don't clear the pre-filled hour on the initial mount when editing —
      // only reset it once the user actually changes the date afterward.
      if (!isFirstLoad.current) {
        setHour(null);
        setMinute(0);
      }
      isFirstLoad.current = false;
      setLoadingHours(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date, appointmentId]);

  useEffect(() => {
    if (!pickupDropoff || !pickupAddress.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the address-check status when pickup is toggled off or the field is cleared
      setPickupEligibility("idle");
      return;
    }
    let cancelled = false;
    setPickupEligibility("checking");
    const timeout = setTimeout(() => {
      checkPickupAddress(pickupAddress).then((result) => {
        if (cancelled) return;
        setPickupEligibility(result.status);
      });
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [pickupDropoff, pickupAddress]);

  const service = pet?.species === "dog" ? dogService : catService;
  // Sorted cheapest-to-priciest so the list stays in a sensible order even
  // after the admin re-prices something (unlike the admin editor itself,
  // which keeps a fixed order so fields don't jump around while typing).
  const includedWithService =
    pet?.species === "dog"
      ? DOG_ADD_ONS_INCLUDED_WITH_SERVICE
      : CAT_ADD_ONS_INCLUDED_WITH_SERVICE;
  const addOnCatalog = [...(pet?.species === "dog" ? dogAddOns(config) : catAddOns(config))]
    .filter((a) => standalone || !includedWithService.includes(a.name))
    .sort((a, b) => a.price - b.price);

  const priceResult = useMemo(() => {
    if (!pet) return null;
    if (pet.species === "dog") {
      return calculateDogPrice(
        {
          weightLb: pet.weight_lb,
          coat: pet.coat,
          service: dogService,
          isPuppy: pet.is_puppy ?? false,
          deshed,
          isDoodleMix: isDoodleMixBreed(pet.breed),
        },
        config,
      );
    }
    return calculateCatPrice(
      {
        weightLb: pet.weight_lb,
        coat: pet.coat,
        service: catService,
        waterless: false,
        deshed,
      },
      config,
    );
  }, [pet, dogService, catService, deshed, config]);

  const creativeAddOnPrice =
    !standalone &&
    creativeTier !== "none" &&
    pet?.species === "dog" &&
    dogService === "haircut"
      ? calculateCreativePrice(creativeTier, pet.weight_lb, config)
      : 0;

  const addOnPrice = (price: number) =>
    hasMembership ? applyMemberAddonDiscount(price, config) : price;
  // What an item will actually cost, after member pricing (if any) and the
  // launch promo (if active) — used to show the real price on every
  // selectable option up front, not just in the running total after picking it.
  const promoAdjust = (price: number) =>
    effectiveDiscountPercent != null ? applyDiscount(price, effectiveDiscountPercent) : price;
  const finalAddOnPrice = (price: number) => promoAdjust(addOnPrice(price));
  const memberPackages = memberPackagePrices(config);
  const packageBasePrice = (t: PackageTier) =>
    hasMembership ? memberPackages[t] : config.packages[t];
  const finalPackagePrice = (t: PackageTier) => promoAdjust(packageBasePrice(t));

  const addOnsTotal = addOnCatalog
    .filter((a) => selectedAddOns.includes(a.name))
    .reduce((sum, a) => sum + addOnPrice(a.price), 0);

  const packagePrice =
    !standalone && packageTier !== "none"
      ? hasMembership
        ? memberPackages[packageTier]
        : config.packages[packageTier]
      : 0;

  const baseServicePrice = redeemCredit
    ? deshed
      ? config.flatFees.deshed
      : 0
    : (priceResult?.total ?? 0);

  const pickupDropoffFee = pickupDropoff ? config.flatFees.pickupDropoff : 0;

  const groomSubtotal = standalone
    ? addOnsTotal
    : baseServicePrice + creativeAddOnPrice + addOnsTotal + packagePrice;

  const totalBeforeCouponAmount = promoAdjust(groomSubtotal) + pickupDropoffFee;
  const total = Math.max(
    0,
    Math.round((totalBeforeCouponAmount - flatDiscountAmount) * 100) / 100,
  );
  const originalTotal = groomSubtotal + pickupDropoffFee;
  const salesTax = calculateSalesTax(total);
  const grandTotal = total + salesTax;
  // The combined percent discount is one additive rate applied once (see
  // createAppointment), so a percent coupon's own share of it is just its
  // percentage of the pre-discount subtotal — independent of whether a
  // promo is also stacked on top. A flat-dollar coupon's savings is just
  // that flat amount.
  const couponSavings = couponActive
    ? couponPercent > 0
      ? Math.round(groomSubtotal * (couponPercent / 100) * 100) / 100
      : couponAmount
    : 0;
  const adminDiscountSavings =
    adminDiscountType === "percent"
      ? Math.round(groomSubtotal * (adminDiscountPercent / 100) * 100) / 100
      : adminDiscountAmount;

  function toggleAddOn(name: string) {
    setSelectedAddOns((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  if (!pet) return null;

  return (
    <form
      action={action ?? (mode === "edit" ? updateAppointment : createAppointment)}
      onSubmit={() => setSubmitting(true)}
      className="space-y-8"
    >
      {hiddenFields &&
        Object.entries(hiddenFields).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      {mode === "edit" && appointmentId && (
        <input type="hidden" name="appointmentId" value={appointmentId} />
      )}
      <input type="hidden" name="petId" value={pet.id} />
      <input
        type="hidden"
        name="service"
        value={standalone ? "standalone" : service}
      />
      <input type="hidden" name="deshed" value={String(deshed)} />
      <input type="hidden" name="creativeTier" value={creativeTier} />
      <input type="hidden" name="addOnNames" value={JSON.stringify(selectedAddOns)} />
      <input type="hidden" name="packageTier" value={packageTier} />
      <input type="hidden" name="standalone" value={String(standalone)} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="hour" value={hour ?? ""} />
      <input type="hidden" name="minute" value={minute} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      <input type="hidden" name="customerNote" value={customerNote} />
      <input type="hidden" name="pickupDropoff" value={String(pickupDropoff)} />
      <input type="hidden" name="pickupAddress" value={pickupAddress} />
      <input type="hidden" name="redeemCredit" value={String(redeemCredit)} />
      <input type="hidden" name="applyCoupon" value={String(applyCoupon)} />
      <input type="hidden" name="adminDiscountType" value={adminDiscountType} />
      <input type="hidden" name="adminDiscountValue" value={adminDiscountValue} />

      <p className="rounded-xl border border-border bg-accent-tint px-4 py-2.5 text-xs text-foreground/90">
        Bringing more than one pet? Please contact us directly so we can
        coordinate your visit.
      </p>

      {mode === "create" && pets.length > 1 && (
        <div>
          <label className="text-sm font-medium text-foreground">Pet</label>
          <div className="mt-2">
            <PillGroup
              options={pets.map((p) => ({ value: p.id, label: p.name }))}
              value={pet.id}
              onChange={setPetId}
            />
          </div>
        </div>
      )}

      {missingVaccine && (
        <div className="rounded-2xl border border-accent-dark/40 bg-accent-tint px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            Rabies vaccine required
          </p>
          <p className="mt-1 text-foreground/90">
            We don&apos;t have a current rabies vaccination record on file
            for {pet.name}. We must see proof of vaccination before their
            appointment. Please upload it from {pet.name}&apos;s pet profile
            as soon as possible.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={toggleStandalone}
        className={`w-full rounded-2xl border p-4 text-left transition-colors ${
          standalone
            ? "border-accent bg-accent-tint"
            : "border-border bg-card hover:border-accent-dark"
        }`}
      >
        <p className="font-serif text-base text-foreground">Standalone</p>
        <p className="mt-1 text-xs text-muted">
          A quick visit for just a nail trim, ear cleaning, or similar. No
          bath or haircut needed. Disables the bath/trim/haircut and
          packages below.
        </p>
      </button>

      <div>
        <label className="text-sm font-medium text-foreground">Service</label>
        <div className="mt-2">
          {pet.species === "dog" ? (
            <PillGroup
              options={(
                [
                  "bath",
                  "trim",
                  "haircut",
                  ...(pet.is_puppy ? (["puppyIntro"] as const) : []),
                ] as DogBookingService[]
              ).map((s) => ({ value: s, label: DOG_SERVICE_LABELS[s] }))}
              value={dogService}
              onChange={setDogService}
              disabled={standalone}
            />
          ) : (
            <PillGroup
              options={(["bath", "lightTrim"] as CatServiceLevel[]).map(
                (s) => ({ value: s, label: CAT_SERVICE_LABELS[s] }),
              )}
              value={catService}
              onChange={setCatService}
              disabled={standalone}
            />
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          {standalone
            ? "Not used for a standalone visit."
            : pet.species === "dog"
              ? DOG_SERVICE_DESCRIPTIONS[dogService]
              : CAT_SERVICE_DESCRIPTIONS[catService]}
        </p>
        {availableCredits > 0 && (
          <label className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-accent-dark/40 bg-accent-tint px-3.5 py-2.5 text-sm text-foreground/90">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={redeemCredit}
                onChange={(e) => setRedeemCredit(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Redeem a prepaid groom pack credit
            </span>
            <span className="shrink-0 text-xs font-medium text-accent-dark">
              {availableCredits} available
            </span>
          </label>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAddOnsOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left"
        >
          <span className="text-sm font-medium text-foreground">
            Add-Ons{" "}
            <span className="font-normal text-muted">
              (optional
              {selectedAddOns.length > 0
                ? ` · ${selectedAddOns.length} selected`
                : ""}
              )
            </span>
          </span>
          <span
            className={`text-muted transition-transform ${addOnsOpen ? "rotate-180" : ""}`}
          >
            ⌄
          </span>
        </button>
        {!addOnsOpen && (
          <p className="mt-1.5 px-1 text-xs text-muted">
            {pet.species === "dog"
              ? standalone
                ? "Nail trim, ear cleaning, anal glands, and more."
                : "Nail grinding, teeth brushing, de-matting, and more."
              : standalone
                ? "Nail trim, ear cleaning, sanitary trim, and more."
                : "De-matting, extra brushing, nail caps, and more."}
          </p>
        )}
        {hasMembership && (
          <p className="mt-1.5 px-1 text-xs font-medium text-accent-dark">
            Member pricing applied.
          </p>
        )}
        {addOnsOpen && (
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
                <span className="shrink-0 text-xs">
                  {finalAddOnPrice(addOn.price) !== addOn.price ? (
                    <>
                      <span className="text-muted line-through">
                        ${addOn.price}
                      </span>{" "}
                      <span className="font-medium text-accent-dark">
                        ${finalAddOnPrice(addOn.price)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">${addOn.price}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {!standalone && (
      <div>
        <label className="text-sm font-medium text-foreground">
          De-Shed &amp; Packages{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setDeshed((v) => !v)}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              deshed
                ? "border-accent bg-accent-tint"
                : "border-border bg-card hover:border-accent-dark"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-serif text-base text-foreground">
                De-Shed Treatment
              </p>
              <span className="shrink-0 text-sm font-medium text-accent-dark">
                {promoAdjust(config.flatFees.deshed) !== config.flatFees.deshed ? (
                  <>
                    <span className="text-muted line-through">
                      ${config.flatFees.deshed}
                    </span>{" "}
                    ${promoAdjust(config.flatFees.deshed)}
                  </>
                ) : (
                  `$${config.flatFees.deshed}`
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              15 extra minutes of brushing, plus a de-shedding shampoo and
              conditioner treatment.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPackageTier("none")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              packageTier === "none"
                ? "border-accent bg-accent-tint"
                : "border-border bg-card hover:border-accent-dark"
            }`}
          >
            <p className="font-serif text-base text-foreground">
              No Package
            </p>
            <p className="mt-1 text-xs text-muted">
              Skip the bundle. Just the service and any add-ons above.
            </p>
          </button>
          {(["freshStart", "pampered", "vip"] as PackageTier[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPackageTier(t)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                packageTier === t
                  ? "border-accent bg-accent-tint"
                  : "border-border bg-card hover:border-accent-dark"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-serif text-base text-foreground">
                  {PACKAGE_LABELS[t]}
                </p>
                <span className="shrink-0 text-sm font-medium text-accent-dark">
                  {finalPackagePrice(t) !== config.packages[t] ? (
                    <>
                      <span className="text-muted line-through">
                        ${config.packages[t]}
                      </span>{" "}
                      ${finalPackagePrice(t)}
                    </>
                  ) : (
                    `$${config.packages[t]}`
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {PACKAGE_DESCRIPTIONS[t]}
              </p>
            </button>
          ))}
        </div>
      </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground">Date</label>
        <div className="mt-2">
          <DatePickerCalendar
            value={date}
            onChange={setDate}
            minDate={todayISO()}
            loadUnavailableDates={getUnavailableDates}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Time {loadingHours && <span className="text-muted">(checking availability…)</span>}
        </label>
        {!loadingHours && dayBlocked && (
          <p className="mt-2 rounded-lg bg-accent-tint px-3 py-2 text-xs text-foreground">
            We&apos;re closed on this date. Please pick another day.
          </p>
        )}
        {!loadingHours && !dayBlocked && dayFull && (
          <p className="mt-2 rounded-lg bg-accent-tint px-3 py-2 text-xs text-foreground">
            This day is fully booked. Please pick another day.
          </p>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {(isAdmin ? [...HOURS, ...ADMIN_EXTRA_HOURS] : HOURS).map((h) => {
            const isSelected = hour === h && minute === 0;
            const isTaken = bookedHours.includes(h);
            // Admin can intentionally double-book a slot (e.g. two dogs
            // from the same household both at 5pm) — everyone else is
            // still blocked from an already-taken or too-soon/past hour.
            const isDisabled =
              !isAdmin && (isTaken || isPastOrTooSoon(date, h, pickupDropoff));
            return (
              <button
                key={h}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  setHour(h);
                  setMinute(0);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected
                    ? "border-accent bg-accent text-white"
                    : isAdmin && isTaken
                      ? "border-accent-dark/40 bg-accent-tint text-foreground/80 hover:border-accent-dark"
                      : "border-border bg-card text-foreground/80 hover:border-accent-dark"
                }`}
              >
                {isSelected && <PawIcon className="h-3.5 w-3.5" />}
                {formatHour(h)}
                {isAdmin && isTaken && !isSelected && (
                  <span className="text-[10px] text-accent-dark">
                    (booked)
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {isAdmin && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent-dark/40 bg-card px-3.5 py-2.5">
            <label
              className="text-sm font-medium text-foreground/90"
              htmlFor="customTime"
            >
              Or type an exact time
            </label>
            <input
              id="customTime"
              type="time"
              step={60}
              value={
                hour !== null
                  ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
                  : ""
              }
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                if (Number.isNaN(h) || Number.isNaN(m)) return;
                setHour(h);
                setMinute(m);
              }}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
            />
            {hour !== null && minute !== 0 && (
              <span className="text-xs text-muted">
                {formatHour(hour, minute)}
              </span>
            )}
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          {isAdmin
            ? "Customers book 8 AM – 4 PM; 5 PM, 6 PM, and any custom time above are for admin bookings only. Slots marked (booked) already have another appointment — you can still pick one to intentionally double-book (e.g. two dogs from the same household at once)."
            : "Appointments run 8 AM – 4 PM, one pet at a time."}
          {pickupDropoff &&
            ` Pickup & drop-off requires booking at least ${PICKUP_MIN_LEAD_HOURS} hour${PICKUP_MIN_LEAD_HOURS === 1 ? "" : "s"} ahead.`}
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Pickup &amp; Drop-Off{" "}
          <span className="font-normal text-muted">
            (optional · 15 minute radius only)
          </span>
        </label>
        <button
          type="button"
          onClick={() => setPickupDropoff((v) => !v)}
          className={`mt-2 w-full rounded-2xl border p-4 text-left transition-colors ${
            pickupDropoff
              ? "border-accent bg-accent-tint"
              : "border-border bg-card hover:border-accent-dark"
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-serif text-base text-foreground">
              We come to you
            </p>
            <span className="shrink-0 text-sm font-medium text-accent-dark">
              ${config.flatFees.pickupDropoff}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Flat fee, covers up to 2 animals per trip. We&apos;ll text you
            when we&apos;re on the way.
          </p>
        </button>
        {pickupDropoff && (
          <>
            <textarea
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              rows={2}
              placeholder="Address for pickup & drop-off"
              className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
            />
            {pickupEligibility === "checking" && (
              <p className="mt-1.5 px-1 text-xs text-muted">
                Checking your address…
              </p>
            )}
            {pickupEligibility === "ineligible" && (
              <p className="mt-2 rounded-lg border border-accent-dark/40 bg-accent-tint px-3 py-2 text-xs text-foreground">
                Sorry, that address looks to be outside our 15-minute pickup
                &amp; drop-off radius. Feel free to email us at{" "}
                <a
                  href="mailto:booking@paintedpawsaustin.com"
                  className="underline"
                >
                  booking@paintedpawsaustin.com
                </a>{" "}
                if you have any questions.
              </p>
            )}
            {pickupEligibility === "unknown" && (
              <p className="mt-2 rounded-lg border border-accent-dark/40 bg-accent-tint px-3 py-2 text-xs text-foreground">
                We couldn&apos;t verify that address is within our 15-minute
                pickup &amp; drop-off radius. Please double-check it&apos;s
                complete, or email us at{" "}
                <a
                  href="mailto:booking@paintedpawsaustin.com"
                  className="underline"
                >
                  booking@paintedpawsaustin.com
                </a>{" "}
                to confirm before booking pickup &amp; drop-off.
              </p>
            )}
          </>
        )}
      </div>

      {isAdmin && (
        <div>
          <label className="text-sm font-medium text-foreground">Payment</label>
          {allowOnlinePayment ? (
            <>
              <div className="mt-2">
                <PillGroup
                  options={[
                    { value: "in_person" as const, label: "Pay in person (Square)" },
                    { value: "online" as const, label: "Pay online now" },
                  ]}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </div>
              {paymentMethod === "online" && (
                <p className="mt-2 text-xs text-muted">
                  You can pay right now or any time after your appointment,
                  before pickup.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground/90">
              Pay in person (Square)
            </p>
          )}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground">
          Haircut inspiration{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <p className="mt-1 text-xs text-muted">
          Have a style in mind? Upload a photo or PDF and/or describe what
          you&apos;re picturing.
        </p>
        <input
          type="file"
          name="inspoPhoto"
          accept="image/*,application/pdf"
          className="mt-2 w-full text-sm text-foreground/80"
        />
        <textarea
          name="haircutDescription"
          rows={2}
          value={haircutDescription}
          onChange={(e) => setHaircutDescription(e.target.value)}
          placeholder="e.g. Teddy bear face, short on the body, keep the ears long…"
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      </div>

      <div>
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="customer-note"
        >
          Notes for your groomer{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="customer-note"
          rows={3}
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          placeholder="Anything you'd like us to know: nervous habits, requests, reminders…"
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      </div>

      {mode === "create" && (
        <WaiverSection value={waiver} onChange={updateWaiver} />
      )}

      <div className="rounded-2xl bg-accent-tint p-6">
        {isAdmin && mode === "create" && (
          <div className="mb-4 rounded-xl border border-accent-dark/40 bg-card px-3.5 py-2.5">
            <p className="text-sm font-medium text-foreground/90">
              Discount for this booking (optional)
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={adminDiscountType}
                onChange={(e) =>
                  setAdminDiscountType(e.target.value as "none" | "percent" | "amount")
                }
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
              >
                <option value="none">No discount</option>
                <option value="percent">% off</option>
                <option value="amount">$ off</option>
              </select>
              {adminDiscountType !== "none" && (
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={adminDiscountValue}
                  onChange={(e) => setAdminDiscountValue(e.target.value)}
                  placeholder="Amount"
                  className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
                />
              )}
            </div>
          </div>
        )}

        {!isAdmin && mode === "create" && !couponCodeApplied && (
          <div className="mb-4 rounded-xl border border-accent-dark/40 bg-card px-3.5 py-2.5">
            <p className="text-sm font-medium text-foreground/90">
              Have a coupon code?
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={couponCodeInput}
                onChange={(e) => {
                  setCouponCodeInput(e.target.value);
                  setCouponCodeError(null);
                }}
                placeholder="Enter code"
                className="w-36 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground uppercase outline-none focus:border-accent-dark"
              />
              <button
                type="button"
                onClick={handleApplyCouponCode}
                disabled={couponCodeSubmitting || !couponCodeInput.trim()}
                className="rounded-full border border-accent-dark px-4 py-2 text-sm font-medium text-accent-dark transition-colors hover:bg-accent-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {couponCodeSubmitting ? "Applying…" : "Apply"}
              </button>
            </div>
            {couponCodeError && (
              <p className="mt-2 text-xs text-accent-dark">{couponCodeError}</p>
            )}
          </div>
        )}

        {mode === "create" && customerCoupon != null && (
          <label className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-accent-dark/40 bg-card px-3.5 py-2.5 text-sm text-foreground/90">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={applyCoupon}
                onChange={(e) => setApplyCoupon(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Use my available coupon
            </span>
            <span className="shrink-0 text-xs font-medium text-accent-dark">
              {customerCoupon.discountPercent != null
                ? `${customerCoupon.discountPercent}% off`
                : `$${customerCoupon.discountAmount} off`}
            </span>
          </label>
        )}

        <div className="flex items-baseline justify-between text-sm text-foreground/80">
          <span>Subtotal</span>
          <span className="flex items-baseline gap-2">
            {(effectiveDiscountPercent != null || flatDiscountAmount > 0) &&
              originalTotal !== total && (
                <span className="text-muted line-through">${originalTotal}</span>
              )}
            <span>${total}</span>
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-sm text-foreground/80">
          <span>Sales tax ({SALES_TAX_PERCENT}%)</span>
          <span>${salesTax}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-border/60 pt-2">
          <span className="font-serif text-lg text-foreground">
            Estimated total
          </span>
          <span className="font-serif text-3xl text-accent-dark">
            ${grandTotal}
          </span>
        </div>
        {promoActive && (
          <p className="mt-1 text-xs font-medium text-accent-dark">
            🎉 {promoDiscountPercent}% off applied — limited-time offer
          </p>
        )}
        {couponActive && (
          <div className="mt-3 rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-medium text-white">
            🎁 Redeeming your{" "}
            {customerCoupon!.discountPercent != null
              ? `${customerCoupon!.discountPercent}% off`
              : `$${customerCoupon!.discountAmount} off`}{" "}
            coupon — you&apos;re saving ${couponSavings.toFixed(2)}
          </div>
        )}
        {adminDiscountType !== "none" && adminDiscountSavings > 0 && (
          <div className="mt-3 rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-medium text-white">
            Applying a{" "}
            {adminDiscountType === "percent"
              ? `${adminDiscountPercent}% off`
              : `$${adminDiscountAmount} off`}{" "}
            discount — saving ${adminDiscountSavings.toFixed(2)}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={
          hour === null ||
          submitting ||
          !waiverValid ||
          tooYoungToBook ||
          (standalone && selectedAddOns.length === 0) ||
          (pickupDropoff && !pickupAddress.trim()) ||
          (pickupDropoff &&
            (pickupEligibility === "ineligible" ||
              pickupEligibility === "unknown"))
        }
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {tooYoungToBook
          ? "Too young to book yet"
          : standalone && selectedAddOns.length === 0
            ? "Pick at least one add-on"
            : hour === null
              ? "Pick a time to continue"
              : !waiverValid
                ? "Complete the waiver to continue"
                : pickupDropoff && !pickupAddress.trim()
                  ? "Add your pickup address to continue"
                  : mode === "edit"
                    ? "Save Changes"
                    : isAdmin
                      ? "Confirm Booking"
                      : "Continue to Payment"}
      </button>

      {showTooYoungModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowTooYoungModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-foreground">
              A little too young just yet! 🐾
            </p>
            <p className="mt-2 text-sm text-muted">
              {pet?.name ?? "Your pup"} isn&apos;t quite 8 weeks old. Please
              come back and book once they&apos;ve reached that milestone.
              We can&apos;t wait to meet them soon!
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTooYoungModal(false)}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Okay, got it
              </button>
            </div>
          </div>
        </div>
      )}

    </form>
  );
}
