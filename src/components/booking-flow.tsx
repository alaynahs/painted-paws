"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateCatPrice,
  calculateCreativePrice,
  calculateDogPrice,
  CAT_ADD_ONS,
  CAT_SERVICE_DESCRIPTIONS,
  CAT_SERVICE_LABELS,
  DESHED_FEE,
  DOG_ADD_ONS,
  DOG_SERVICE_DESCRIPTIONS,
  DOG_SERVICE_LABELS,
  PACKAGE_DESCRIPTIONS,
  PACKAGE_LABELS,
  PACKAGE_PRICES,
  monthsSince,
  type CatServiceLevel,
  type CreativeTier,
  type DogBookingService,
  type PackageTier,
} from "@/lib/pricing/pricing";
import {
  getBookedHours,
  getUnavailableDates,
  createAppointment,
  updateAppointment,
} from "@/app/book/actions";
import { BOOKING_HOURS as HOURS } from "@/lib/booking-hours";
import { formatDate, formatHour } from "@/lib/format";
import type { CoatLength } from "@/lib/pricing/breeds";
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
  paymentMethod: "online" | "in_person";
  customerNote?: string;
  standalone?: boolean;
}


function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
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
}: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={opt.disabled}
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
}: {
  pets: Pet[];
  mode?: "create" | "edit";
  appointmentId?: string;
  initial?: BookingInitialValues;
  action?: (formData: FormData) => void;
  hiddenFields?: Record<string, string>;
  allowOnlinePayment?: boolean;
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
  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [dayBlocked, setDayBlocked] = useState(false);
  const [dayFull, setDayFull] = useState(false);
  const [closedModal, setClosedModal] = useState<"blocked" | "full" | null>(null);
  const [loadingHours, setLoadingHours] = useState(false);
  const isFirstLoad = useRef(true);

  const [paymentMethod, setPaymentMethod] = useState<"online" | "in_person">(
    initial?.paymentMethod ?? "in_person",
  );
  const [customerNote, setCustomerNote] = useState(initial?.customerNote ?? "");
  const [haircutDescription, setHaircutDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waiver, setWaiver] = useState<WaiverState>(WAIVER_DEFAULTS);
  const updateWaiver = (patch: Partial<WaiverState>) =>
    setWaiver((w) => ({ ...w, ...patch }));
  const waiverValid = mode === "edit" || isWaiverValid(waiver);

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
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off an async availability fetch when `date` changes
    setLoadingHours(true);
    getBookedHours(date, appointmentId).then((availability) => {
      if (cancelled) return;
      setBookedHours(availability.bookedHours);
      setDayBlocked(availability.dayBlocked);
      setDayFull(availability.dayFull);
      setClosedModal(
        availability.dayBlocked ? "blocked" : availability.dayFull ? "full" : null,
      );
      // Don't clear the pre-filled hour on the initial mount when editing —
      // only reset it once the user actually changes the date afterward.
      if (!isFirstLoad.current) {
        setHour(null);
      }
      isFirstLoad.current = false;
      setLoadingHours(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date, appointmentId]);

  const service = pet?.species === "dog" ? dogService : catService;
  const addOnCatalog = pet?.species === "dog" ? DOG_ADD_ONS : CAT_ADD_ONS;

  const priceResult = useMemo(() => {
    if (!pet) return null;
    if (pet.species === "dog") {
      return calculateDogPrice({
        weightLb: pet.weight_lb,
        coat: pet.coat,
        service: dogService,
        isPuppy: pet.is_puppy ?? false,
        isDoodle: false,
        deshed,
      });
    }
    return calculateCatPrice({
      weightLb: pet.weight_lb,
      coat: pet.coat,
      service: catService,
      waterless: false,
      deshed,
    });
  }, [pet, dogService, catService, deshed]);

  const creativeAddOnPrice =
    !standalone &&
    creativeTier !== "none" &&
    pet?.species === "dog" &&
    dogService === "haircut"
      ? calculateCreativePrice(creativeTier, pet.weight_lb)
      : 0;

  const addOnsTotal = addOnCatalog
    .filter((a) => selectedAddOns.includes(a.name))
    .reduce((sum, a) => sum + a.price, 0);

  const packagePrice =
    !standalone && packageTier !== "none" ? PACKAGE_PRICES[packageTier] : 0;

  const total = standalone
    ? addOnsTotal
    : (priceResult?.total ?? 0) + creativeAddOnPrice + addOnsTotal + packagePrice;

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
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      <input type="hidden" name="customerNote" value={customerNote} />

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
            appointment — please upload it from {pet.name}&apos;s pet profile
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
          A quick visit for just a nail trim, ear cleaning, or similar — no
          bath or haircut needed. Skips the bath/trim/haircut and packages
          below.
        </p>
      </button>

      {!standalone && (
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
              />
            ) : (
              <PillGroup
                options={(["bath", "lightTrim"] as CatServiceLevel[]).map(
                  (s) => ({ value: s, label: CAT_SERVICE_LABELS[s] }),
                )}
                value={catService}
                onChange={setCatService}
              />
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            {pet.species === "dog"
              ? DOG_SERVICE_DESCRIPTIONS[dogService]
              : CAT_SERVICE_DESCRIPTIONS[catService]}
          </p>
        </div>
      )}

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
                ? ` — ${selectedAddOns.length} selected`
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
              ? "Nail grinding, teeth brushing, ear cleaning, and more."
              : "Nail trim, ear cleaning, sanitary trim, and more."}
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
                <span className="shrink-0 text-xs text-muted">
                  ${addOn.price}
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
                ${DESHED_FEE}
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
              Skip the bundle — just the service and any add-ons above.
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
                  ${PACKAGE_PRICES[t]}
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
            We&apos;re closed on this date — please pick another day.
          </p>
        )}
        {!loadingHours && !dayBlocked && dayFull && (
          <p className="mt-2 rounded-lg bg-accent-tint px-3 py-2 text-xs text-foreground">
            This day is fully booked — please pick another day.
          </p>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {HOURS.map((h) => {
            const isSelected = hour === h;
            const isDisabled = bookedHours.includes(h);
            return (
              <button
                key={h}
                type="button"
                disabled={isDisabled}
                onClick={() => setHour(h)}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-card text-foreground/80 hover:border-accent-dark"
                }`}
              >
                {isSelected && <PawIcon className="h-3.5 w-3.5" />}
                {formatHour(h)}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          Appointments run 8 AM – 4 PM, one pet at a time.
        </p>
      </div>

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
                You can pay right now or any time after your appointment —
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

      <div>
        <label className="text-sm font-medium text-foreground">
          Haircut inspiration{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <p className="mt-1 text-xs text-muted">
          Have a style in mind? Upload a photo and/or describe what
          you&apos;re picturing.
        </p>
        <input
          type="file"
          name="inspoPhoto"
          accept="image/*"
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
          placeholder="Anything you'd like us to know — nervous habits, requests, reminders…"
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
        />
      </div>

      {mode === "create" && (
        <WaiverSection value={waiver} onChange={updateWaiver} />
      )}

      <div className="rounded-2xl bg-accent-tint p-6">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-lg text-foreground">
            Estimated total
          </span>
          <span className="font-serif text-3xl text-accent-dark">
            ${total}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={
          hour === null ||
          submitting ||
          !waiverValid ||
          tooYoungToBook ||
          (standalone && selectedAddOns.length === 0)
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
                : mode === "edit"
                  ? "Save Changes"
                  : "Confirm Booking"}
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
              {pet?.name ?? "Your pup"} isn&apos;t quite 8 weeks old — please
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

      {closedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setClosedModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-foreground">
              {closedModal === "blocked"
                ? "Sorry, we're out of paw-fice! 🐾"
                : "Fully booked that day! 🐾"}
            </p>
            <p className="mt-2 text-sm text-muted">
              {closedModal === "blocked"
                ? `We're closed on ${formatDate(date)} — please pick another date and we'll see you soon!`
                : `We're already booked solid on ${formatDate(date)} — please pick another date.`}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setClosedModal(null)}
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
