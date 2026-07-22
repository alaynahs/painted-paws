import Link from "next/link";
import PawIcon from "@/components/paw-icon";
import RevealOnScroll from "@/components/reveal-on-scroll";

const dogCore = [
  {
    name: "Bath",
    blurb: "A refreshing wash and blow-dry.",
    includes: "Bath, 15-min brush-out, nail trim, and ear cleaning. Anal gland expression, paw pad trim, and sanitary trim available upon request.",
  },
  {
    name: "De-Shed Bath",
    blurb: "Everything in a Bath, with a deep-shedding treatment.",
    includes: "All Bath inclusions, plus a de-shedding treatment.",
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
    includes: "All Bath inclusions, plus a de-shedding treatment.",
  },
  {
    name: "Light Tidy",
    blurb: "A bath plus a light trim.",
    includes: "All Bath inclusions, plus a paw pad shave and sanitary trim.",
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
];

const packages = [
  {
    name: "Fresh Start",
    altName: "Refresh",
    body: "Teeth brushing, cologne, bandana or bow, and deep coat conditioner.",
  },
  {
    name: "Pampered",
    altName: "Indulge",
    body: "Everything in Fresh Start, plus nail grinding.",
  },
  {
    name: "VIP Treatment",
    altName: "Prestige",
    body: "Everything in Pampered, plus a paw & nose balm massage, VIP shampoo & conditioner, and a discount on your next visit.",
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
    name: "Spa Pup",
    body: "Monthly Bath + Brush at 10% off, priority booking, discounted add-ons. Subscribe 3 months and get a 4th month free.",
  },
  {
    name: "Royal Pup",
    body: "Monthly Bath + Trim at 10% off, priority booking, discounted add-ons. Subscribe 4 months and get a 5th month free.",
  },
  {
    name: "Couture Pup",
    body: "Monthly Bath + Full Haircut at 10% off, priority booking, discounted add-ons. Subscribe 5 months and get a 6th month free.",
  },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {children}
    </div>
  );
}

export default function ServicesPage() {
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
          Pricing is calculated for your pet when you{" "}
          <Link href="/book" className="text-accent-dark hover:underline">
            book an appointment
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="font-serif text-2xl text-foreground">Dogs</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dogCore.map((s, i) => (
            <RevealOnScroll key={s.name} delay={(i % 4) * 80}>
              <Card>
                <h3 className="font-serif text-lg text-foreground">{s.name}</h3>
                <p className="mt-1 text-sm text-muted">{s.blurb}</p>
                <p className="mt-3 text-xs text-muted">{s.includes}</p>
              </Card>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="font-serif text-2xl text-foreground">Cats</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catCore.map((s, i) => (
            <RevealOnScroll key={s.name} delay={(i % 3) * 80}>
              <Card>
                <h3 className="font-serif text-lg text-foreground">{s.name}</h3>
                <p className="mt-1 text-sm text-muted">{s.blurb}</p>
                <p className="mt-3 text-xs text-muted">{s.includes}</p>
              </Card>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="font-serif text-2xl text-foreground">
            Add-Ons / Standalone Services
          </h2>
          <p className="mt-2 text-sm text-muted">
            Layer any of these onto a core service to tailor the visit.
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
            <RevealOnScroll key={p.name} delay={i * 100}>
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
            Pet-safe dye, applied with care. Not bookable yet — check back
            soon!
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {creativeTiers.map((t, i) => (
              <RevealOnScroll key={t.name} delay={i * 100}>
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
          For regulars — lock in priority booking and discounted add-ons.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {memberships.map((m, i) => (
            <RevealOnScroll key={m.name} delay={i * 100}>
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
              <li>Pets must be ready to go when we arrive — additional waiting may incur extra fees.</li>
              <li>Dogs must be on a leash; cats must be in a carrier.</li>
              <li>We don&apos;t enter customers&apos; homes.</li>
              <li>Photos are taken for documentation before departure.</li>
            </ul>
          </RevealOnScroll>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <RevealOnScroll>
            <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
              About
            </p>
            <h2 className="mt-3 font-serif text-3xl text-foreground">
              Meet Painted Paws
            </h2>
            <p className="mt-4 text-muted">
              Painted Paws is a private, in-home grooming studio in Austin,
              TX. Every appointment is one-on-one — your dog is never left in
              a kennel or crated between steps. It&apos;s a calmer, more
              personal alternative to a busy commercial salon, whether
              you&apos;re after a classic breed-standard cut or a bold
              creative transformation.
            </p>
            <p className="mt-4 text-sm text-muted italic">
              [Add your own story here — how you got started, your
              experience, and what grooming philosophy means to you.]
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={150} className="rounded-2xl border border-border bg-accent-tint p-8">
            <h3 className="font-serif text-lg text-foreground">
              Curbside Hand-Off Policy
            </h3>
            <p className="mt-3 text-sm text-muted">
              To keep the studio calm and stress-free, our home workspace is
              a pet-only zone. When you arrive, park in the driveway and send
              a quick text — we&apos;ll meet you at your car to bring your dog
              in, and do the same for pickup once the groom is complete.
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              No walk-ins — appointments only.
            </p>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  );
}
