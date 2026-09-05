import Link from "next/link";
import PawIcon from "@/components/paw-icon";
import RevealOnScroll from "@/components/reveal-on-scroll";
import { getPricingConfig } from "@/lib/pricing/config";
import {
  DOG_WEIGHT_LABELS,
  PUPPY_WEIGHT_LABELS,
  type DogWeightClass,
  type PuppyWeightBand,
  type WeightCoatPrice,
} from "@/lib/pricing/pricing";

const DOG_WEIGHT_CLASSES: DogWeightClass[] = ["small", "medium", "large", "xlarge"];
const PUPPY_WEIGHT_BANDS: PuppyWeightBand[] = ["under5", "under10", "under20", "over20"];

function formatCoatPrice(p: WeightCoatPrice) {
  return p.short === p.long ? `$${p.short}` : `$${p.short}–$${p.long}`;
}

const dogCore = [
  {
    name: "Bath",
    blurb: "A refreshing wash and blow-dry.",
    includes: "Bath, 15-min brush-out, nail trim, ear cleaning, and cologne. Anal gland expression, paw pad trim, and sanitary trim available upon request.",
  },
  {
    name: "De-Shed Bath",
    blurb: "Everything in a Bath, with a deep-shedding treatment.",
    includes: "All Bath inclusions, plus 15 minutes of extra brushing and a de-shedding treatment.",
  },
  {
    name: "Tidy Up",
    blurb: "A bath plus a light trim.",
    includes: "All Bath inclusions, plus a face, feet, and sanitary trim.",
  },
  {
    name: "Full Groom",
    blurb: "A bath plus a complete haircut.",
    includes: "All Bath inclusions, plus a full body contour or breed-standard cut.",
  },
];

const catCore = [
  {
    name: "Bath",
    blurb: "A gentle water bath and blow-out.",
    includes: "Water bath, 15-min brushing, nail clipping, ear cleaning, and blow-out.",
  },
  {
    name: "De-Shed Bath",
    blurb: "Everything in a Bath, with a deep-shedding treatment.",
    includes: "All Bath inclusions, plus 15 minutes of extra brushing and a de-shedding treatment.",
  },
  {
    name: "Bath & Tidy",
    blurb: "A bath plus a light trim.",
    includes: "All Bath inclusions, plus a paw pad shave and sanitary trim.",
  },
  {
    name: "Flea Bath",
    blurb: "A flea treatment bath and rinse.",
    includes: "Eliminates fleas and soothes irritated skin. Flat rate, any size or coat.",
  },
  {
    name: "Flea Bath & Tidy",
    blurb: "A flea treatment bath plus a light trim.",
    includes: "All Flea Bath inclusions, plus a paw pad shave and sanitary trim. Flat rate, any size or coat.",
  },
];

const dogAddOns = [
  "Bow or bandana",
  "Paw + nose balm",
  "Ear cleaning",
  "Ear plucking",
  "Deep coat conditioner",
  "Paw pad shave",
  "Bow + braids",
  "Nail polish",
  "Teeth brushing",
  "Anal glands",
  "Flea bath",
  "Nail trim",
  "Sanitary shave",
  "Extra brushing",
  "Nail grinding",
];

const catAddOns = [
  "Ear cleaning",
  "Paw pad shave",
  "Sanitary trim",
  "Extra brushing",
  "Nail trim",
  "Nail caps",
];

const packages = [
  {
    name: "Fresh Start",
    altName: "Refresh",
    body: "Teeth brushing, bandana or bow, and deep coat conditioner.",
  },
  {
    name: "Pampered",
    altName: "Indulge",
    body: "Everything in Fresh Start, plus nail grinding.",
  },
  {
    name: "VIP Treatment",
    altName: "Prestige",
    body: "Everything in Pampered, plus a paw & nose balm, massage, VIP shampoo & conditioner, and a discount on your next visit.",
  },
];

const creativeTiers = [
  {
    name: "Accent / Color Pop",
    body: "A single pop of color on the ears, tail, or feet. Any size dog.",
  },
  {
    name: "Showstopper / Mini Makeover",
    body: "Multiple color accents across the coat. Any size dog.",
  },
  {
    name: "Fantasy / Full Transformation",
    body: "A complete design transformation, priced by your dog's size.",
  },
];

const memberships = [
  {
    name: "Bath",
    body: "Monthly Bath at your dog's normal rate, priority booking, and 15% off add-ons and bundles.",
  },
  {
    name: "Bath & Tidy",
    body: "Monthly Bath + Tidy Up at your dog's normal rate, priority booking, and 15% off add-ons and bundles.",
  },
  {
    name: "Bath & Full Groom",
    body: "Monthly Bath + Full Groom at your dog's normal rate, priority booking, and 15% off add-ons and bundles.",
  },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-6">
      {children}
    </div>
  );
}

export default async function ServicesPage() {
  const config = await getPricingConfig();

  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
        <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
          Services
        </p>
        <h1 className="mt-3 font-serif text-4xl text-foreground">
          Every groom starts with the essentials.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">
          Choose a level of service, then make it your own with add-ons.
          Base pricing by weight and coat is below — {" "}
          <Link href="/book" className="text-accent-dark hover:underline">
            book an appointment
          </Link>{" "}
          to get your pet&apos;s exact price with any add-ons.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="font-serif text-2xl text-foreground">Dogs</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dogCore.map((s, i) => (
            <RevealOnScroll key={s.name} delay={(i % 4) * 80} className="h-full">
              <Card>
                <h3 className="font-serif text-lg text-foreground">{s.name}</h3>
                <p className="mt-1 text-sm text-muted">{s.blurb}</p>
                <p className="mt-3 text-xs text-muted">{s.includes}</p>
              </Card>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
            Dog Pricing by Weight
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Weight</th>
                  <th className="py-2 pr-4">Bath</th>
                  <th className="py-2 pr-4">Tidy Up</th>
                  <th className="py-2">Full Groom</th>
                </tr>
              </thead>
              <tbody>
                {DOG_WEIGHT_CLASSES.map((wc) => (
                  <tr key={wc} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium text-foreground">
                      {DOG_WEIGHT_LABELS[wc]}
                    </td>
                    <td className="py-2 pr-4 text-foreground/90">
                      {formatCoatPrice(config.dog.bath[wc])}
                    </td>
                    <td className="py-2 pr-4 text-foreground/90">
                      {formatCoatPrice(config.dog.trim[wc])}
                    </td>
                    <td className="py-2 text-foreground/90">
                      {formatCoatPrice(config.dog.haircut[wc])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            Prices shown as short coat–long coat. De-shed treatment, add-ons,
            and packages are priced separately.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={100} className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
            Puppy Pricing by Weight{" "}
            <span className="font-normal normal-case text-muted">(under 6 months)</span>
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Weight</th>
                  <th className="py-2 pr-4">Bath</th>
                  <th className="py-2 pr-4">Tidy Up</th>
                  <th className="py-2">Full Groom</th>
                </tr>
              </thead>
              <tbody>
                {PUPPY_WEIGHT_BANDS.map((band) => (
                  <tr key={band} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium text-foreground">
                      {PUPPY_WEIGHT_LABELS[band]}
                    </td>
                    <td className="py-2 pr-4 text-foreground/90">
                      ${config.puppy.bath[band]}
                    </td>
                    <td className="py-2 pr-4 text-foreground/90">
                      ${config.puppy.trim[band]}
                    </td>
                    <td className="py-2 text-foreground/90">
                      ${config.puppy.haircut[band]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            Puppy Intro to Grooming: ${config.puppy.introPrice} flat, any size.
          </p>
        </RevealOnScroll>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="font-serif text-2xl text-foreground">Cats</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catCore.map((s, i) => (
            <RevealOnScroll key={s.name} delay={(i % 3) * 80} className="h-full">
              <Card>
                <h3 className="font-serif text-lg text-foreground">{s.name}</h3>
                <p className="mt-1 text-sm text-muted">{s.blurb}</p>
                <p className="mt-3 text-xs text-muted">{s.includes}</p>
              </Card>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
            Cat Pricing by Coat
          </h3>
          <p className="mt-1 text-xs text-muted">
            Cat pricing is flat rate by coat length, not weight.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Coat</th>
                  <th className="py-2 pr-4">Bath</th>
                  <th className="py-2">Bath &amp; Tidy</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium text-foreground">Short</td>
                  <td className="py-2 pr-4 text-foreground/90">${config.cat.bath.short}</td>
                  <td className="py-2 text-foreground/90">${config.cat.lightTrim.short}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Long</td>
                  <td className="py-2 pr-4 text-foreground/90">${config.cat.bath.long}</td>
                  <td className="py-2 text-foreground/90">${config.cat.lightTrim.long}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            {`Flea Bath: $${config.cat.fleaBath} flat · Flea Bath & Tidy: $${config.cat.fleaBathTidy} flat. Any size or coat.`}
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={100} className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
            Kitten Pricing
          </h3>
          <p className="mt-1 text-xs text-muted">
            Flat rate, any size or coat. Waterless options are for kittens
            not yet ready for a full water bath.
          </p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
              <span className="text-foreground/90">Bath</span>
              <span className="font-medium text-foreground">${config.cat.kitten.bath}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
              <span className="text-foreground/90">Bath &amp; Tidy</span>
              <span className="font-medium text-foreground">${config.cat.kitten.lightTrim}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
              <span className="text-foreground/90">Waterless Bath</span>
              <span className="font-medium text-foreground">${config.cat.kitten.waterlessBath}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
              <span className="text-foreground/90">Waterless Bath &amp; Tidy</span>
              <span className="font-medium text-foreground">${config.cat.kitten.waterlessLightTrim}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
              <span className="text-foreground/90">Flea Bath</span>
              <span className="font-medium text-foreground">${config.cat.kitten.fleaBath}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
              <span className="text-foreground/90">Flea Bath &amp; Tidy</span>
              <span className="font-medium text-foreground">${config.cat.kitten.fleaBathTidy}</span>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="font-serif text-2xl text-foreground">
            Add-Ons / Standalone Services
          </h2>
          <p className="mt-2 text-sm text-muted">
            Layer any of these onto a core service to tailor the visit. Ear
            cleaning, paw pad shave, sanitary shave/trim, nail trim, and
            anal glands (dogs) already come free with any Bath, Tidy Up, or
            Full Groom — they&apos;re only priced separately for a
            standalone visit that skips the core service.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <RevealOnScroll className="rounded-2xl border border-border bg-background p-6">
              <h3 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
                Dogs
              </h3>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {dogAddOns.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <PawIcon className="h-3 w-3" />
                    </span>
                    <span className="flex-1 text-sm text-foreground/90">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </RevealOnScroll>
            <RevealOnScroll delay={120} className="rounded-2xl border border-border bg-background p-6">
              <h3 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
                Cats
              </h3>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {catAddOns.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <PawIcon className="h-3 w-3" />
                    </span>
                    <span className="flex-1 text-sm text-foreground/90">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="font-serif text-2xl text-foreground">Luxury Packages</h2>
        <p className="mt-2 text-sm text-muted">
          Can&apos;t decide? These bundles combine our most popular add-ons.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {packages.map((p, i) => (
            <RevealOnScroll key={p.name} delay={i * 100} className="h-full">
              <Card>
                <h3 className="font-serif text-lg text-foreground">
                  {p.name}
                  <span className="text-muted"> / {p.altName}</span>
                </h3>
                <p className="mt-3 text-sm text-muted">{p.body}</p>
              </Card>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-accent-tint">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-serif text-2xl text-foreground">
              Creative Grooming
            </h2>
            <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
              Coming Soon
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Add a splash of color or a full design on top of any full groom.
            Pet-safe dye, applied with care. Not bookable yet. Check back
            soon!
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {creativeTiers.map((t, i) => (
              <RevealOnScroll key={t.name} delay={i * 100} className="h-full">
                <Card>
                  <h3 className="font-serif text-lg text-foreground">
                    {t.name}
                  </h3>
                  <p className="mt-3 text-sm text-muted">{t.body}</p>
                </Card>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="font-serif text-2xl text-foreground">
          Monthly Memberships
        </h2>
        <p className="mt-2 text-sm text-muted">
          For regulars: lock in priority booking and discounted add-ons.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {memberships.map((m, i) => (
            <RevealOnScroll key={m.name} delay={i * 100} className="h-full">
              <Card>
                <h3 className="font-serif text-lg text-foreground">{m.name}</h3>
                <p className="mt-3 text-sm text-muted">{m.body}</p>
              </Card>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-center font-serif text-2xl text-foreground">
            Pickup &amp; Drop-Off
          </h2>
          <RevealOnScroll className="mx-auto mt-6 max-w-2xl rounded-2xl border border-border bg-background p-6 text-sm text-muted">
            <p className="font-medium text-foreground">Available for up to 2 animals per trip.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>We give arrival/pickup time windows, not exact times.</li>
              <li>Pets must be ready to go when we arrive. Additional waiting may incur extra fees.</li>
              <li>Dogs must be on a leash; cats must be in a carrier.</li>
              <li>We do not enter customers&apos; homes.</li>
              <li>Photos are taken for documentation before departure.</li>
            </ul>
            <p className="mt-4">
              <span className="rounded-full bg-accent-tint px-3 py-1 text-xs font-medium text-foreground/80">
                ✓ Clean Driving Record
              </span>
            </p>
          </RevealOnScroll>
        </div>
      </section>

    </div>
  );
}
