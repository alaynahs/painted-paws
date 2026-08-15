import { requireAdmin } from "@/lib/supabase/admin";
import { getPricingConfig } from "@/lib/pricing/config";
import {
  DOG_ADD_ON_NAMES,
  CAT_ADD_ON_NAMES,
  DOG_WEIGHT_LABELS,
  PUPPY_WEIGHT_LABELS,
  type DogWeightClass,
  type PuppyWeightBand,
  type CatWeightClass,
} from "@/lib/pricing/pricing";
import {
  updateDogMatrix,
  updatePuppyPricing,
  updateCatMatrix,
  updateFlatFees,
  updateAdvanceBookingDiscount,
  updateDoodleMixPricing,
  updateDogAddOns,
  updateCatAddOns,
  updatePackagesAndMemberDiscount,
  updateCreativeTiers,
  updateGroomPackTiers,
} from "./actions";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  resetPromotionRemaining,
} from "@/app/admin/promotions/actions";

const DOG_WEIGHT_CLASSES: DogWeightClass[] = ["small", "medium", "large", "xlarge"];
const PUPPY_BANDS: PuppyWeightBand[] = ["under5", "under10", "under20", "over20"];
const CAT_WEIGHT_CLASSES: CatWeightClass[] = ["under20", "over20"];
const CAT_WEIGHT_LABELS: Record<CatWeightClass, string> = {
  under20: "Under 20 lb",
  over20: "Over 20 lb",
};

function NumberField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        step="0.01"
        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
      />
    </label>
  );
}

function SaveButton({ label = "Save" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
    >
      {label}
    </button>
  );
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in the browser's own local
// time, not the UTC ISO string the DB stores.
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-serif text-lg text-foreground">{title}</h2>
      {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      {children}
    </section>
  );
}

export default async function AdminPricingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { saved, error } = await searchParams;
  const config = await getPricingConfig();

  const { data: promotions } = await supabase
    .from("promotions")
    .select(
      "id, name, discount_percent, max_uses, starts_at, ends_at, max_appointment_lead_days, active, banner_message",
    )
    .order("created_at", { ascending: false });

  const promoIds = (promotions ?? []).map((p) => p.id);
  const usageById = new Map<string, number>();
  if (promoIds.length > 0) {
    const { data: usageRows } = await supabase
      .from("appointments")
      .select("promo_id")
      .in("promo_id", promoIds);
    for (const row of usageRows ?? []) {
      if (!row.promo_id) continue;
      usageById.set(row.promo_id, (usageById.get(row.promo_id) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">Pricing</h1>
      <p className="mt-3 text-sm text-muted">
        Edit any price on the site here. Each section below saves
        independently — changing one won&apos;t affect the others. Prices
        already charged (past bookings, active memberships, purchased groom
        packs) are locked in and never change retroactively.
      </p>

      {saved && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          Saved.
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-6">
        <Section
          title="Dog Grooming Prices"
          description="By weight class and coat length."
        >
          <form action={updateDogMatrix}>
            <div className="mt-4 space-y-6 overflow-x-auto">
              {(["bath", "trim", "haircut"] as const).map((service) => (
                <div key={service}>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {service === "bath"
                      ? "Bath"
                      : service === "trim"
                        ? "Tidy Up (bath + trim)"
                        : "Full Groom (bath + haircut)"}
                  </p>
                  <div className="mt-2 grid min-w-[500px] grid-cols-4 gap-3">
                    {DOG_WEIGHT_CLASSES.map((wc) => (
                      <div key={wc} className="space-y-2">
                        <p className="text-xs font-medium text-foreground/80">
                          {DOG_WEIGHT_LABELS[wc]}
                        </p>
                        <NumberField
                          name={`dog-${service}-${wc}-short`}
                          label="Short coat"
                          defaultValue={config.dog[service][wc].short}
                        />
                        <NumberField
                          name={`dog-${service}-${wc}-long`}
                          label="Long coat"
                          defaultValue={config.dog[service][wc].long}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section
          title="Puppy Pricing"
          description="Priced by absolute weight for pets under 6 months, plus the flat Puppy Intro rate."
        >
          <form action={updatePuppyPricing}>
            <div className="mt-4 space-y-6 overflow-x-auto">
              {(["bath", "trim", "haircut"] as const).map((service) => (
                <div key={service}>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {service}
                  </p>
                  <div className="mt-2 grid min-w-[400px] grid-cols-4 gap-3">
                    {PUPPY_BANDS.map((band) => (
                      <NumberField
                        key={band}
                        name={`puppy-${service}-${band}`}
                        label={PUPPY_WEIGHT_LABELS[band]}
                        defaultValue={config.puppy[service][band]}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="max-w-[150px]">
                <NumberField
                  name="puppy-introPrice"
                  label="Puppy Intro to Grooming (flat rate)"
                  defaultValue={config.puppy.introPrice}
                />
              </div>
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section
          title="Cat Grooming Prices"
          description="Regular and waterless options, by weight and coat length."
        >
          <form action={updateCatMatrix}>
            <div className="mt-4 space-y-6 overflow-x-auto">
              {(
                [
                  ["bath", "Bath"],
                  ["lightTrim", "Light Tidy"],
                  ["waterlessBath", "Waterless Bath"],
                  ["waterlessLightTrim", "Waterless Light Tidy"],
                ] as const
              ).map(([service, label]) => (
                <div key={service}>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <div className="mt-2 grid min-w-[400px] grid-cols-2 gap-3">
                    {CAT_WEIGHT_CLASSES.map((wc) => (
                      <div key={wc} className="space-y-2">
                        <p className="text-xs font-medium text-foreground/80">
                          {CAT_WEIGHT_LABELS[wc]}
                        </p>
                        <NumberField
                          name={`cat-${service}-${wc}-short`}
                          label="Short coat"
                          defaultValue={config.cat[service][wc].short}
                        />
                        <NumberField
                          name={`cat-${service}-${wc}-long`}
                          label="Long coat"
                          defaultValue={config.cat[service][wc].long}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <p className="text-sm font-medium text-foreground">
                  Flea Bath / Flea Bath & Tidy
                </p>
                <p className="mt-1 text-xs text-muted">
                  Flat rate, any weight or coat length.
                </p>
                <div className="mt-2 grid max-w-md grid-cols-2 gap-3">
                  <NumberField
                    name="cat-fleaBath"
                    label="Flea Bath"
                    defaultValue={config.cat.fleaBath}
                  />
                  <NumberField
                    name="cat-fleaBathTidy"
                    label="Flea Bath & Tidy"
                    defaultValue={config.cat.fleaBathTidy}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Kitten Pricing
                </p>
                <p className="mt-1 text-xs text-muted">
                  Flat rate per service, any weight or coat length —
                  overrides everything above (including flea rates) when the
                  pet is marked a kitten.
                </p>
                <div className="mt-2 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                  <NumberField
                    name="cat-kitten-bath"
                    label="Bath"
                    defaultValue={config.cat.kitten.bath}
                  />
                  <NumberField
                    name="cat-kitten-lightTrim"
                    label="Bath & Tidy"
                    defaultValue={config.cat.kitten.lightTrim}
                  />
                  <NumberField
                    name="cat-kitten-fleaBath"
                    label="Flea Bath"
                    defaultValue={config.cat.kitten.fleaBath}
                  />
                  <NumberField
                    name="cat-kitten-fleaBathTidy"
                    label="Flea Bath & Tidy"
                    defaultValue={config.cat.kitten.fleaBathTidy}
                  />
                </div>
              </div>
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section title="Flat Fees">
          <form action={updateFlatFees}>
            <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
              <NumberField
                name="flatFee-deshed"
                label="De-Shed Treatment"
                defaultValue={config.flatFees.deshed}
              />
              <NumberField
                name="flatFee-pickupDropoff"
                label="Pickup & Drop-Off"
                defaultValue={config.flatFees.pickupDropoff}
              />
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section
          title="Advance Booking Discount"
          description="A flat-dollar discount applied automatically when a customer books at least this many weeks ahead — no code needed."
        >
          <form action={updateAdvanceBookingDiscount}>
            <label className="mt-4 flex items-center gap-2 text-sm text-foreground/90">
              <input
                type="checkbox"
                name="advanceBookingDiscount-active"
                value="true"
                defaultChecked={config.advanceBookingDiscount.active}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Active
            </label>
            <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
              <NumberField
                name="advanceBookingDiscount-amount"
                label="Discount ($)"
                defaultValue={config.advanceBookingDiscount.amount}
              />
              <NumberField
                name="advanceBookingDiscount-minLeadWeeks"
                label="Minimum lead time (weeks)"
                defaultValue={config.advanceBookingDiscount.minLeadWeeks}
              />
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section title="Doodle Mix Pricing (45+ lb)">
          <p className="mt-1 text-sm text-muted">
            Flat rates for standard-sized doodle crosses (Goldendoodle,
            Labradoodle, Aussiedoodle, Bernedoodle, Cavapoo, Cockapoo) at 45
            lb or more — same price regardless of coat length. Smaller
            doodles, and doodle bookings under this weight, still use the
            regular Dog Pricing matrix above.
          </p>
          <form action={updateDoodleMixPricing}>
            <div className="mt-4 grid max-w-md grid-cols-3 gap-3">
              <NumberField
                name="doodleMix-bath45Plus"
                label="Bath"
                defaultValue={config.doodleMix.bath45Plus}
              />
              <NumberField
                name="doodleMix-trim45Plus"
                label="Trim"
                defaultValue={config.doodleMix.trim45Plus}
              />
              <NumberField
                name="doodleMix-haircut45Plus"
                label="Haircut"
                defaultValue={config.doodleMix.haircut45Plus}
              />
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section title="Dog Add-Ons">
          <form action={updateDogAddOns}>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {DOG_ADD_ON_NAMES.map((name, i) => (
                <NumberField
                  key={name}
                  name={`addon-dog-${i}`}
                  label={name}
                  defaultValue={config.addOns.dog[i]}
                />
              ))}
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section title="Cat Add-Ons">
          <form action={updateCatAddOns}>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {CAT_ADD_ON_NAMES.map((name, i) => (
                <NumberField
                  key={name}
                  name={`addon-cat-${i}`}
                  label={name}
                  defaultValue={config.addOns.cat[i]}
                />
              ))}
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section
          title="Add-On Bundles & Member Discount"
          description="The member discount applies to individual add-ons and bundle prices for pets with an active membership."
        >
          <form action={updatePackagesAndMemberDiscount}>
            <div className="mt-4 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
              <NumberField
                name="package-freshStart"
                label="Fresh Start / Refresh"
                defaultValue={config.packages.freshStart}
              />
              <NumberField
                name="package-pampered"
                label="Pampered / Indulge"
                defaultValue={config.packages.pampered}
              />
              <NumberField
                name="package-vip"
                label="VIP Treatment / Prestige"
                defaultValue={config.packages.vip}
              />
              <NumberField
                name="memberAddonDiscountPercent"
                label="Member Discount (%)"
                defaultValue={config.memberAddonDiscountPercent}
              />
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section
          title="Creative Grooming Tiers"
          description="Fantasy transformation is priced by weight; the two break points (15 lb, 40 lb) aren't editable, only the three prices."
        >
          <form action={updateCreativeTiers}>
            <div className="mt-4 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField
                name="creative-accentPop"
                label="Accent / Color Pop"
                defaultValue={config.creative.accentPop}
              />
              <NumberField
                name="creative-showstopper"
                label="Showstopper"
                defaultValue={config.creative.showstopper}
              />
              <div />
              <NumberField
                name="creative-fantasy-upTo15"
                label="Fantasy, up to 15 lb"
                defaultValue={config.creative.fantasy.upTo15}
              />
              <NumberField
                name="creative-fantasy-upTo40"
                label="Fantasy, up to 40 lb"
                defaultValue={config.creative.fantasy.upTo40}
              />
              <NumberField
                name="creative-fantasy-over40"
                label="Fantasy, over 40 lb"
                defaultValue={config.creative.fantasy.over40}
              />
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section
          title="Groom Pack Tiers"
          description="How many paid + free credits each pack includes."
        >
          <form action={updateGroomPackTiers}>
            <div className="mt-4 grid max-w-md grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Buy 5, Get 1 Free
                </p>
                <div className="mt-2 space-y-2">
                  <NumberField
                    name="groomPack-five-paidCount"
                    label="Paid credits"
                    defaultValue={config.groomPacks.five.paidCount}
                  />
                  <NumberField
                    name="groomPack-five-freeCount"
                    label="Free credits"
                    defaultValue={config.groomPacks.five.freeCount}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Buy 9, Get 3 Free
                </p>
                <div className="mt-2 space-y-2">
                  <NumberField
                    name="groomPack-nine-paidCount"
                    label="Paid credits"
                    defaultValue={config.groomPacks.nine.paidCount}
                  />
                  <NumberField
                    name="groomPack-nine-freeCount"
                    label="Free credits"
                    defaultValue={config.groomPacks.nine.freeCount}
                  />
                </div>
              </div>
            </div>
            <SaveButton />
          </form>
        </Section>

        <Section
          title="Promotions"
          description="Create as many named promotions as you'd like. Only one-time bookings through /book can use them — never memberships or groom packs. When more than one promotion is running at once, the highest discount wins. A booking only qualifies for a promo's appointment-lead-time rule (if set) based on the date the customer picks, not the day they book."
        >
          <div className="mt-4 space-y-4">
            {(promotions ?? []).length === 0 && (
              <p className="text-sm text-muted">No promotions yet.</p>
            )}
            {(promotions ?? []).map((promo) => {
              const used = usageById.get(promo.id) ?? 0;
              return (
                <div
                  key={promo.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <form action={updatePromotion} className="space-y-3">
                    <input type="hidden" name="id" value={promo.id} />
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex-1">
                        <span className="text-xs text-muted">Name</span>
                        <input
                          type="text"
                          name="name"
                          defaultValue={promo.name}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                        />
                      </label>
                      <label className="flex shrink-0 items-center gap-2 pt-4 text-sm text-foreground/90">
                        <input
                          type="checkbox"
                          name="active"
                          value="true"
                          defaultChecked={promo.active}
                          className="h-4 w-4 rounded border-border accent-accent"
                        />
                        Active
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <NumberField
                        name="discountPercent"
                        label="Discount (%)"
                        defaultValue={promo.discount_percent}
                      />
                      <label className="block">
                        <span className="text-xs text-muted">
                          Max bookings (blank = unlimited)
                        </span>
                        <input
                          type="number"
                          name="maxUses"
                          defaultValue={promo.max_uses ?? ""}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted">
                          Must book appointment within (days, blank = no limit)
                        </span>
                        <input
                          type="number"
                          name="maxAppointmentLeadDays"
                          defaultValue={promo.max_appointment_lead_days ?? ""}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                        />
                      </label>
                      <p className="self-end pb-1.5 text-xs text-muted">
                        {used} used
                        {promo.max_uses != null ? ` / ${promo.max_uses}` : ""}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                      <label className="block">
                        <span className="text-xs text-muted">Starts</span>
                        <input
                          type="datetime-local"
                          name="startsAt"
                          defaultValue={toDatetimeLocal(promo.starts_at)}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted">
                          Ends (blank = runs until stopped)
                        </span>
                        <input
                          type="datetime-local"
                          name="endsAt"
                          defaultValue={
                            promo.ends_at ? toDatetimeLocal(promo.ends_at) : ""
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs text-muted">
                        Banner message (optional — leave blank for the
                        default wording)
                      </span>
                      <input
                        type="text"
                        name="bannerMessage"
                        defaultValue={promo.banner_message ?? ""}
                        placeholder="e.g. Use code PAWS for 20% off!"
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                      />
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                  {promo.max_uses != null && (
                    <form
                      action={resetPromotionRemaining}
                      className="mt-3 flex items-end gap-2 border-t border-border pt-3"
                    >
                      <input type="hidden" name="id" value={promo.id} />
                      <label className="block">
                        <span className="text-xs text-muted">
                          Reset bookings left to
                        </span>
                        <input
                          type="number"
                          name="remaining"
                          defaultValue={Math.max(0, promo.max_uses - used)}
                          className="mt-1 w-24 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark"
                      >
                        Reset
                      </button>
                    </form>
                  )}
                  <form action={deletePromotion} className="mt-2">
                    <input type="hidden" name="id" value={promo.id} />
                    <button
                      type="submit"
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Delete this promotion
                    </button>
                  </form>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm font-medium text-foreground">
              Add a new promotion
            </p>
            <form action={createPromotion} className="mt-3 space-y-3">
              <label className="block">
                <span className="text-xs text-muted">Name</span>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Fall Special"
                  required
                  className="mt-1 w-full max-w-sm rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                />
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NumberField
                  name="discountPercent"
                  label="Discount (%)"
                  defaultValue={20}
                />
                <label className="block">
                  <span className="text-xs text-muted">
                    Max bookings (blank = unlimited)
                  </span>
                  <input
                    type="number"
                    name="maxUses"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">
                    Must book appointment within (days, blank = no limit)
                  </span>
                  <input
                    type="number"
                    name="maxAppointmentLeadDays"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <label className="block">
                  <span className="text-xs text-muted">Starts</span>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    required
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">
                    Ends (blank = runs until stopped)
                  </span>
                  <input
                    type="datetime-local"
                    name="endsAt"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-muted">
                  Banner message (optional — leave blank for the default
                  wording)
                </span>
                <input
                  type="text"
                  name="bannerMessage"
                  placeholder="e.g. Use code PAWS for 20% off!"
                  className="mt-1 w-full max-w-sm rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent-dark"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground/90">
                <input
                  type="checkbox"
                  name="bannerOnly"
                  value="true"
                  className="h-4 w-4 rounded border-border accent-accent"
                />
                Banner only — announce it, don&apos;t actually discount
                anything (e.g. to advertise a coupon code instead). Requires
                a banner message above.
              </label>
              <SaveButton label="Create Promotion" />
            </form>
          </div>
        </Section>
      </div>
    </div>
  );
}
