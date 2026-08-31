import Image from "next/image";
import Link from "next/link";
import HeroFadeGallery from "@/components/hero-fade-gallery";
import PawIcon from "@/components/paw-icon";
import RevealOnScroll from "@/components/reveal-on-scroll";
import ReviewsCarousel from "@/components/reviews-carousel";
import TrackHomeLanding from "@/components/track-home-landing";
import { createClient } from "@/lib/supabase/server";

// Ordered longest review to shortest.
const realReviews = [
  {
    quote:
      "My toy poodle was way overdue for a groom and got all the attention and pampering she wanted. She came home happy and looking so cute! I live about 30 minutes away, but it's absolutely worth the drive. Highly recommend!",
    attribution: "Grace G.",
    rating: 5,
  },
  {
    quote:
      "They did an awesome job with my Pomeranian mix, especially considering he was way overdue and needed some extra attention. He looks and feels so much better, and we will be back for sure!",
    attribution: "Camille E.",
    rating: 5,
  },
  {
    quote:
      "Love coming to Painted Paws Austin. She has reasonable prices, gentle and kind with my pup. Millie has no problem going straight to the door.",
    attribution: "Nayda H.",
    rating: 5,
  },
  {
    quote:
      "Just had my dog groomed by Alaynah yesterday and she did a fantastic job. I highly recommend.",
    attribution: "Mary Anne S.",
    rating: 5,
  },
  {
    quote: "Alaynah did an amazing job. We will be back.",
    attribution: "Jamie M.",
    rating: 5,
  },
  {
    quote: "Great experience with my 2 Shih Tzus.",
    attribution: "Eve G.",
    rating: 5,
  },
];

const features = [
  {
    title: "One-on-one",
    body: "Your pet is the only one here for their appointment. No kennels, no crowded lobby, no waiting in a cage between steps.",
  },
  {
    title: "In-home studio",
    body: "A calm, dedicated grooming space in a real home, not a busy commercial salon. No barking chorus, no chaos.",
  },
  {
    title: "Dogs & cats welcome",
    body: "Baths, trims, and full grooms for pups, plus gentle bath and tidy services for the cats of the house too.",
  },
  {
    title: "Regular grooming",
    body: "Classic breed-standard cuts and baths, done with care and attention to detail. (Creative color and styling coming soon!)",
  },
  {
    title: "Unhurried pace",
    body: "No back-to-back rushing. Every appointment gets the time it actually needs, especially for nervous first-timers.",
  },
  {
    title: "Curbside hand-off",
    body: "Text when you arrive and we'll meet you at the car for a simple, no-walk-in-required drop-off and pickup.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: heroPhotos } = await supabase
    .from("site_photos")
    .select("*")
    .eq("location", "hero")
    .order("sort_order", { ascending: true });

  const galleryItems = (heroPhotos ?? []).map((p) => ({
    src: supabase.storage.from("site-photos").getPublicUrl(p.storage_path)
      .data.publicUrl,
    caption: p.caption,
  }));

  return (
    <div>
      <TrackHomeLanding />
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-accent-dark uppercase">
              Located in Village at Northtown, Pflugerville, TX &middot; By
              appointment only
            </p>
            <h1 className="mt-5 font-serif text-5xl leading-[1.05] tracking-tight text-foreground sm:text-7xl">
              One-on-one{" "}
              <span className="italic text-accent-dark">
                pet grooming.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Painted Paws is a private, in-home grooming studio for pets who
              deserve unhurried, one-on-one attention, from classic baths to
              breed-standard haircuts, in a space built for calm, not chaos.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="rounded-full bg-pastel-yellow/70 px-3 py-1 font-semibold text-foreground/85">
                Zero cages
              </span>
              <span className="rounded-full bg-pastel-mint/70 px-3 py-1 font-semibold text-foreground/85">
                Insured
              </span>
              <span className="rounded-full bg-pastel-lavender/70 px-3 py-1 font-semibold text-foreground/85">
                3-Day Look Great Guarantee
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/book"
                className="rounded-full bg-accent px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Book an Appointment
              </Link>
              <Link
                href="/portfolio"
                className="rounded-full border border-border px-7 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
              >
                View Portfolio
              </Link>
            </div>
          </div>

          <HeroFadeGallery items={galleryItems.length > 0 ? galleryItems : undefined} />
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <RevealOnScroll key={f.title} delay={(i % 3) * 100}>
              <h2 className="font-serif text-xl font-medium text-foreground">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <RevealOnScroll className="mx-auto w-full max-w-sm">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border">
                <Image
                  src="/about-groomer-corgi.jpg"
                  alt="The Painted Paws groomer with her cat"
                  fill
                  className="object-cover"
                />
              </div>
            </RevealOnScroll>
            <RevealOnScroll delay={100}>
              <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
                About
              </p>
              <h2 className="mt-3 font-serif text-3xl text-foreground">
                Meet Painted Paws
              </h2>
              <p className="mt-4 text-muted">
                Painted Paws is a private, in-home grooming studio in Austin,
                TX. Every appointment is one-on-one. Your dog is never left in
                a kennel or crated between steps. It&apos;s a calmer, more
                personal alternative to a busy commercial salon, whether
                you&apos;re after a classic breed-standard cut or a bold
                creative transformation.
              </p>
              <p className="mt-4 text-muted">
                I started off as a dog walker and sitter, then a bather,
                eventually going to school to become a groomer, and then a
                professional pet stylist. I&apos;ve since gone solo to give
                pets the kind of
                experience I always wished they could have. Most corporate
                grooming settings are built around speed, which never really
                gives a pet the chance to get truly comfortable with the
                process, and it can be a genuinely stressful experience for
                them. Painted Paws exists to do it differently: unhurried,
                personalized, and paced around your pet, not the clock.
              </p>
              <p className="mt-4 text-muted">
                Animals have been part of my life since childhood. I&apos;ve
                personally raised birds, rabbits, guinea pigs, a horse, dogs,
                cats, and even a hedgehog, so I bring a genuine, well-rounded
                understanding of animal behavior and comfort to every
                appointment.
              </p>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <RevealOnScroll className="rounded-2xl border border-border bg-foreground/[0.03] px-6 py-6 sm:px-10 sm:py-8">
          <p className="text-center text-xs font-semibold tracking-widest text-accent-dark uppercase">
            See What Pet Parents Have to Say
          </p>
          <div className="mt-5">
            <ReviewsCarousel reviews={realReviews} />
          </div>
        </RevealOnScroll>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <RevealOnScroll className="text-center">
          <p className="text-xs font-semibold tracking-widest text-accent-dark uppercase">
            The Painted Paws experience
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl font-serif text-4xl tracking-tight text-foreground">
            Less salon, more spa day.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            No waiting rooms full of strangers, no cage dryers humming down
            the hall. Just your pet, one groomer, and a quiet, cozy space
            built entirely around them.
          </p>
        </RevealOnScroll>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          <RevealOnScroll delay={0} className="rounded-2xl border border-border bg-accent-tint p-6 text-center">
            <p className="text-2xl">🛁</p>
            <h3 className="mt-3 font-serif text-lg text-foreground">
              Pampered, top to bottom
            </h3>
            <p className="mt-2 text-sm text-muted">
              Warm baths, soft towels, and luxury shampoo & conditioner
              blends picked for your pet&apos;s coat and skin.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={100} className="rounded-2xl border border-border bg-accent-tint p-6 text-center">
            <p className="text-2xl">🐾</p>
            <h3 className="mt-3 font-serif text-lg text-foreground">
              Handled gently
            </h3>
            <p className="mt-2 text-sm text-muted">
              Patient, low-stress handling for anxious first-timers and
              seasoned spa-day regulars alike, at their pace, not the clock&apos;s.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={200} className="rounded-2xl border border-border bg-accent-tint p-6 text-center">
            <p className="text-2xl">💅</p>
            <h3 className="mt-3 font-serif text-lg text-foreground">
              A little extra luxury
            </h3>
            <p className="mt-2 text-sm text-muted">
              Bows, balms, and blowouts for the pets who like to leave
              looking (and feeling) a little fancier.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <RevealOnScroll>
              <p className="text-xs font-semibold tracking-widest text-accent-dark uppercase">
                What we offer
              </p>
              <h2 className="mt-3 font-serif text-4xl tracking-tight text-foreground">
                From a refreshing bath to a full breed-standard cut.
              </h2>
              <p className="mt-4 text-muted">
                Every appointment starts with a bath, brush-out, nail trim,
                and ear cleaning. From there, choose a breed-standard
                haircut or a tidy trim, priced to your pet&apos;s coat and
                weight. (Creative color coming soon!)
              </p>
              <Link
                href="/services"
                className="mt-6 inline-block text-sm font-medium text-accent-dark hover:underline"
              >
                See all services &rarr;
              </Link>
            </RevealOnScroll>
            <RevealOnScroll delay={150} className="rounded-2xl border border-border bg-accent-tint p-8">
              <p className="font-serif text-xl italic text-foreground">
                &ldquo;This doodle came in with six months of growth.
                Let&apos;s bring back the teddy-bear cut.&rdquo;
              </p>
              <p className="mt-4 text-sm text-muted">
                Every pet has a story. Follow along on Instagram for
                before-and-afters and a look inside the studio.
              </p>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-2">
          <RevealOnScroll className="relative rounded-2xl border border-border bg-card p-8">
            <span className="absolute -top-3 -right-2 rotate-6 rounded-full bg-pastel-pink px-3 py-1 text-xs font-medium text-foreground/80 shadow-sm">
              Woof! 🐶
            </span>
            <PawIcon className="h-5 w-5 text-accent-dark" />
            <p className="mt-4 font-serif text-lg italic text-foreground">
              &ldquo;He usually shakes the whole car ride here. Today he
              fell asleep on the table.&rdquo;
            </p>
            <p className="mt-3 text-sm text-muted">
              That&apos;s the goal every time: calm enough to nap through
              a blowout.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={150} className="relative rounded-2xl border border-border bg-card p-8">
            <span className="absolute -top-3 -right-2 -rotate-6 rounded-full bg-pastel-lavender px-3 py-1 text-xs font-medium text-foreground/80 shadow-sm">
              Meow~ 🐱
            </span>
            <PawIcon className="h-5 w-5 text-accent-dark" />
            <p className="mt-4 font-serif text-lg italic text-foreground">
              &ldquo;Didn&apos;t think we&apos;d find anyone patient enough
              for her. Turns out she just needed a quieter room.&rdquo;
            </p>
            <p className="mt-3 text-sm text-muted">
              Cats get the same one-on-one, no-rush treatment as every dog
              on the schedule.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <RevealOnScroll className="rounded-2xl border border-border bg-accent-tint p-8">
            <h3 className="font-serif text-lg text-foreground">
              Curbside Hand-Off Policy
            </h3>
            <p className="mt-3 text-sm text-muted">
              To keep the studio calm and stress-free, our home workspace is
              a pet-only zone. When you arrive, park in the driveway and send
              a quick text. We&apos;ll meet you at your car to bring your dog
              in, and do the same for pickup once the groom is complete.
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              No walk-ins. Appointments only.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="border-t border-border">
        <RevealOnScroll className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="font-serif text-4xl tracking-tight text-foreground">
            Ready to book your pup&apos;s (or kitty&apos;s) spa day?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Appointments are limited to keep every visit calm and unhurried.
            Reserve your spot online in a couple minutes.
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
