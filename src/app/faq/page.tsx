import Link from "next/link";
import FaqSearch from "@/components/faq-search";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
} from "@/lib/notifications/templates";

export const metadata = {
  title: "FAQ | Painted Paws",
};

const faqGroups = [
  {
    group: "Booking & Appointments",
    items: [
      {
        q: "What are your hours?",
        a: "We're open 8 AM – 6 PM, by appointment only. No walk-ins. Appointments can be booked from 8 AM up to a 4 PM start time.",
      },
      {
        q: "How do I book?",
        a: "Create a free account and book online in a couple minutes. Pricing is calculated live for your pet's breed, weight, and coat.",
      },
      {
        q: "Can I book just a nail trim or ear cleaning, without a bath or haircut?",
        a: "Yes, use the \"Standalone\" option at the top of the booking form. It skips the bath/trim/haircut picker entirely and lets you choose only the add-ons you need.",
      },
      {
        q: "Can I bring more than one pet?",
        a: "Please contact us directly first so we can coordinate your visit, rather than booking multiple pets through a single online appointment.",
      },
      {
        q: "How young can my puppy be for their first groom?",
        a: "Puppies must be at least 8 weeks old before their first appointment, for their safety.",
      },
    ],
  },
  {
    group: "Pickup & Drop-Off",
    items: [
      {
        q: "How does curbside hand-off work?",
        a: "Our home workspace is a pet-only zone. We don't do walk-ins or home entry. When you arrive, park in the driveway and send a quick text; we'll meet you at your car to bring your pet in, and do the same for pickup once the groom is complete.",
      },
      {
        q: "Do you offer pickup and drop-off?",
        a: "Yes, for a flat $25 fee, covering up to 2 animals per trip. You can add this at booking and enter your address; we'll text you when we're on the way.",
      },
    ],
  },
  {
    group: "Health & Safety Requirements",
    items: [
      {
        q: "Do you require proof of vaccination?",
        a: "Yes. A current rabies vaccination record must be on file before your appointment. You can upload it from your pet's profile. Puppies under 4 months are exempt.",
      },
      {
        q: "What if my pet was just vaccinated?",
        a: "For your pet's safety, we can't groom within 24 hours of a new vaccination. Please pick a later date if this applies.",
      },
      {
        q: "What if my pet's coat is severely matted?",
        a: "A shave-down may be needed for your pet's comfort and safety, and additional handling fees may apply. You'll be asked about this when you fill out the safety waiver at booking.",
      },
    ],
  },
  {
    group: "Grooming Frequency & Coat Care",
    items: [
      {
        q: "How often should my dog be groomed?",
        a: "It depends mostly on coat type, not size or age. Short, smooth coats (Labs, Beagles, Boxers) generally do well every 8–12 weeks. Heavy double coats that shed (Golden Retrievers, Huskies, German Shepherds) do best every 6–8 weeks to manage shedding and keep the undercoat healthy. Curly or non-shedding coats (Poodles, Doodles, Bichons, Shih Tzus) need the most frequent care, every 4–6 weeks, since that coat type doesn't shed out on its own and mats quickly without regular maintenance.",
      },
      {
        q: "Why do Doodles and Poodle mixes need grooming more often?",
        a: "Their curly, non-shedding coat is prone to matting close to the skin, which can become painful and require a full shave-down if it goes too long between visits. Sticking to a 4–6 week schedule is the best way to avoid that.",
      },
      {
        q: "How often do nails need to be trimmed?",
        a: "Nails grow on their own schedule, separate from coat and shedding, so we recommend a trim every 3–4 weeks regardless of how often your dog gets a full groom. Overgrown nails can affect your dog's posture and cause real discomfort. You don't need to book a full groom for this, use the \"Standalone\" option to book just a nail trim (or nail trim plus ear cleaning, etc.) on its own.",
      },
      {
        q: "What happens if I wait too long between grooms?",
        a: "The coat has more time to tangle and mat, which can mean a longer, less comfortable appointment and sometimes a shave-down for your pet's safety and comfort (see our matting policy above). Keeping to a regular schedule for your dog's coat type is the easiest way to avoid this altogether.",
      },
    ],
  },
  {
    group: "Cancellations & No-Shows",
    items: [
      {
        q: "What's your cancellation policy?",
        a: "If you can't make it, please cancel or reschedule from your account as soon as you know.",
      },
      {
        q: "What counts as a no-show?",
        a: "If you don't show up and don't reach out, that appointment is recorded as a no-call-no-show once we cancel it on our end — which happens 15 minutes past your start time. Cancelling ahead of time for any reason, even last-minute, is never treated as a no-show.",
      },
      {
        q: "What happens after repeated no-shows?",
        a: "After 3 no-shows, online booking is disabled for that account. You'll need to email us directly to book any future appointments.",
      },
      {
        q: "Is my deposit refundable if I need to cancel?",
        a: "Yes. Whether you paid in full or with a 50% deposit, the full amount is refundable if you need to cancel or in the event of a no-show.",
      },
    ],
  },
  {
    group: "Payment & Memberships",
    items: [
      {
        q: "How can I pay?",
        a: "Payment is collected online by card. You can either pay in full at booking, or pay a 50% deposit and settle the rest after your appointment.",
      },
      {
        q: "What do memberships include?",
        a: "Each membership tier includes one monthly grooming visit priced the same as booking à la carte. Membership doesn't discount the groom itself, it unlocks priority booking plus a member discount on individual add-ons and add-on bundles. Memberships are billed online through a real monthly subscription and can be cancelled anytime.",
      },
      {
        q: "Are the add-on bundles only available with a membership?",
        a: "No. Every add-on (teeth brushing, nail grinding, and more) is also available a la carte on any appointment, membership or not. Members simply get a discount on them.",
      },
      {
        q: "What are groom packs?",
        a: "A groom pack is a one-time pre-purchase of Bath, Bath & Tidy, or Full Groom visits for a specific dog: buy 5, get 1 free, or buy 9, get 3 more free. It's priced at that dog's own rate based on weight and coat, not a flat price.",
      },
      {
        q: "Do groom pack credits expire?",
        a: "No. Credits stay on your account indefinitely and are redeemed one at a time whenever you book that dog for that same service.",
      },
      {
        q: "Can I add extras to a groom pack, or use a credit toward a different service?",
        a: "You can add a one-time bundle and/or individual add-ons when you buy the pack. The credits themselves only cover the base groom price you purchased; de-shed treatment, creative color, add-ons, bundles, and pickup & drop-off still cost extra at booking, same as normal. Credits aren't interchangeable between Bath, Bath & Tidy, and Full Groom.",
      },
      {
        q: "Do I need a membership to buy a groom pack?",
        a: "No, groom packs are available to anyone. If you do have an active membership on that dog, your member discount also applies to any add-ons or bundles added to the pack purchase.",
      },
    ],
  },
  {
    group: "About the Business",
    items: [
      {
        q: "Where are you located?",
        a: "Austin, TX, a private, in-home studio, not a commercial salon.",
      },
      {
        q: "Are you insured?",
        a: "Yes. Certified, insured, and with a clean driving record for pickup & drop-off visits.",
      },
      {
        q: "Do you offer creative color or design grooming?",
        a: "Not yet. Creative grooming (color accents, full designs) is coming soon. Regular breed-standard grooming is available now.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        FAQ
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Frequently Asked Questions
      </h1>
      <p className="mt-3 text-muted">
        Can&apos;t find what you&apos;re looking for? Call or text{" "}
        <a
          href={`tel:${BUSINESS_PHONE_TEL}`}
          className="text-accent-dark hover:underline"
        >
          {BUSINESS_PHONE_DISPLAY}
        </a>
        , or email{" "}
        <a
          href="mailto:booking@paintedpawsaustin.com"
          className="text-accent-dark hover:underline"
        >
          booking@paintedpawsaustin.com
        </a>
        .
      </p>

      <FaqSearch groups={faqGroups} />

      <div className="mt-12 rounded-2xl border border-border bg-accent-tint p-6 text-center">
        <p className="font-serif text-lg text-foreground">
          Still have questions?
        </p>
        <p className="mt-2 text-sm text-muted">
          We&apos;re happy to help. Reach out any time.
        </p>
        <Link
          href="/book"
          className="mt-4 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
