import Link from "next/link";
import PawIcon from "@/components/paw-icon";
import RevealOnScroll from "@/components/reveal-on-scroll";

const transformations = [
  { caption: "Goldendoodle", tag: "Teddy Bear Cut" },
  { caption: "Shih Tzu", tag: "Full Groom" },
  { caption: "Poodle Mix", tag: "Breed Standard Cut" },
  { caption: "Yorkshire Terrier", tag: "Bath & Blowout" },
  { caption: "Husky", tag: "De-Shed Treatment" },
  { caption: "Schnauzer", tag: "Face, Feet & Sanitary Trim" },
];

const creativeGrooms = [
  { caption: "Accent Color Pop", tag: "Ears & Tail" },
  { caption: "Showstopper Makeover", tag: "Multiple Accents" },
  { caption: "Fantasy Transformation", tag: "Full Design" },
];

const testimonials = [
  {
    quote:
      "We are beyond happy with our visit. The groom quality, knowledge, and friendliness were a 10/10 across the board. It's clear how much care goes into every appointment.",
    attribution: "A very happy pet parent",
  },
  {
    quote:
      "The de-shed treatment on our husky duo was incredible. The before and after pictures still give us chills. Seeing our babies all cleaned up and fluffy again made our whole day.",
    attribution: "Husky duo's pet parent",
  },
  {
    quote:
      "Always so kind, so patient, and clearly loves what she does. You can tell every dog that walks in gets treated like family.",
    attribution: "A regular client",
  },
  {
    quote:
      "She's so passionate about the pets that come through her door, always eager to learn and always gentle, and it shows in the results every time.",
    attribution: "A grateful pet parent",
  },
  {
    quote:
      "Curbside drop-off and pickup is so easy, right on time every time, and my pup always comes out calm and happy. You can tell how much care goes into keeping things organized.",
    attribution: "A returning pet parent",
  },
  {
    quote:
      "She puts so much heart into every groom and genuinely gets to know each dog. It's obvious in the results and in how comfortable my pup is every time we come back.",
    attribution: "Loyal customer",
  },
  {
    quote:
      "Bella always comes home so squeaky clean and her coat sparkling. Thank you for taking such good care of her!",
    attribution: "Bella's pet parent, a regular",
  },
  {
    quote: "Very knowledgeable and helpful for our needs.",
    attribution: "A new customer",
  },
  {
    quote:
      "Alaynah and my dog Sammy are best friends! She always loves coming to the salon to see her.",
    attribution: "Sammy's pet parent",
  },
  {
    quote: "Matilda always comes home looking and smelling great! Thank you Alaynah!",
    attribution: "Matilda's pet parent",
  },
];

function PhotoTile({
  caption,
  tag,
  comingSoon = false,
}: {
  caption: string;
  tag: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative flex aspect-square flex-col items-center justify-center gap-3 border-b border-border bg-accent-tint text-muted">
        {comingSoon && (
          <span className="absolute top-3 right-3 rounded-full bg-accent px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white shadow-sm">
            Coming Soon
          </span>
        )}
        <PawIcon className="h-8 w-8 opacity-40" />
        <span className="text-xs">Photo coming soon</span>
      </div>
      <div className="p-4">
        <p className="font-serif text-base text-foreground">{caption}</p>
        <p className="mt-0.5 text-xs text-muted">{tag}</p>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
        <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
          Portfolio
        </p>
        <h1 className="mt-3 font-serif text-4xl text-foreground">
          Every dog has a story.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">
          A look at recent transformations — from a refreshing bath and
          breed-standard cut to a full creative makeover. Real photos are on
          their way; check back soon.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="font-serif text-2xl text-foreground">
          Before &amp; After
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {transformations.map((t, i) => (
            <RevealOnScroll key={t.caption} delay={(i % 3) * 100}>
              <PhotoTile caption={t.caption} tag={t.tag} />
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card">
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
            Bold color and full design transformations, applied with pet-safe
            dye. Not bookable yet — check back soon!
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creativeGrooms.map((t, i) => (
              <RevealOnScroll key={t.caption} delay={(i % 3) * 100}>
                <PhotoTile caption={t.caption} tag={t.tag} comingSoon />
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-accent-tint">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-center font-serif text-2xl text-foreground">
            What Pet Parents Say
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <RevealOnScroll
                key={t.attribution}
                delay={(i % 3) * 100}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <PawIcon className="h-5 w-5 text-accent-dark" />
                <p className="mt-3 font-serif text-base italic text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="mt-3 text-xs font-medium tracking-wide text-muted uppercase">
                  {t.attribution}
                </p>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <RevealOnScroll className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="font-serif text-3xl text-foreground">
            Ready to see your pup here?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Book an appointment and let&apos;s create something your dog will
            wear proudly.
          </p>
          <Link
            href="/book"
            className="mt-8 inline-block rounded-full bg-accent px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Book Now
          </Link>
        </RevealOnScroll>
      </section>
    </div>
  );
}
