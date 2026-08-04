import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { joinMembership, purchaseGroomPack } from "@/app/membership/actions";
import MembershipCard from "@/components/membership-card";
import MembershipTierPicker from "@/components/membership-tier-picker";
import GroomPackPicker from "@/components/groom-pack-picker";
import RevealOnScroll from "@/components/reveal-on-scroll";
import {
  GROOM_PACK_SERVICE_LABELS,
  type GroomPackService,
} from "@/lib/pricing/pricing";
import { getPricingConfig } from "@/lib/pricing/config";

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; joined?: string }>;
}) {
  const { error, message, joined } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const config = await getPricingConfig();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
          Memberships
        </p>
        <h1 className="mt-3 font-serif text-3xl text-foreground">
          Log in to join
        </h1>
        <p className="mt-4 text-muted">
          Create a free account or log in to enroll your dog in a monthly
          membership.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, breed, species, weight_lb, coat, is_puppy")
    .eq("owner_id", user.id)
    .eq("species", "dog")
    .order("created_at", { ascending: true });

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*, pets(name)")
    .eq("customer_id", user.id)
    .eq("status", "active");

  const enrolledPetIds = new Set((memberships ?? []).map((m) => m.pet_id));
  const availablePets = (pets ?? []).filter((p) => !enrolledPetIds.has(p.id));

  const { data: groomPacks } = await supabase
    .from("groom_credit_packs")
    .select("*, pets(name)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const activePacks = (groomPacks ?? []).filter(
    (p) =>
      p.payment_status === "paid" &&
      p.credits_used < p.paid_count + p.free_count,
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Memberships
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Monthly Memberships
      </h1>
      <p className="mt-3 text-muted">
        For regulars: a monthly membership at your dog&apos;s normal groom
        price that unlocks priority booking plus discounted add-ons and
        bundles. Or skip the subscription and pre-purchase a pack of grooms
        at a built-in discount instead.
      </p>

      {joined && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          You&apos;re enrolled! See your membership below.
        </p>
      )}
      {message && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      {memberships && memberships.length > 0 && (
        <RevealOnScroll className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-lg text-foreground">
            Your Memberships
          </h2>
          <div className="mt-4 space-y-3">
            {memberships.map((m) => (
              <MembershipCard key={m.id} membership={m} />
            ))}
          </div>
        </RevealOnScroll>
      )}

      <RevealOnScroll delay={100} className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          Join a Membership
        </h2>
        {!pets || pets.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Memberships are for dogs right now. Add a dog to your pet
            profile to enroll.{" "}
            <Link href="/account/pets/new" className="text-accent-dark hover:underline">
              Add a pet
            </Link>
          </p>
        ) : availablePets.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            All of your dogs are already enrolled in a membership.
          </p>
        ) : (
          <div className="mt-4">
            <MembershipTierPicker pets={availablePets} action={joinMembership} config={config} />
          </div>
        )}
      </RevealOnScroll>

      {activePacks.length > 0 && (
        <RevealOnScroll delay={150} className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-lg text-foreground">
            Your Groom Packs
          </h2>
          <div className="mt-4 space-y-3">
            {activePacks.map((pack) => {
              const remaining =
                pack.paid_count + pack.free_count - pack.credits_used;
              return (
                <div
                  key={pack.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <p className="font-serif text-base text-foreground">
                    {pack.pets?.name ?? "Pet"} ·{" "}
                    {
                      GROOM_PACK_SERVICE_LABELS[
                        pack.service as GroomPackService
                      ]
                    }
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {remaining} credit{remaining === 1 ? "" : "s"} remaining
                  </p>
                </div>
              );
            })}
          </div>
        </RevealOnScroll>
      )}

      <RevealOnScroll delay={275} className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          Pre-Purchase a Groom Pack
        </h2>
        <p className="mt-2 text-sm text-muted">
          Skip the subscription: buy a batch of Baths or Full Grooms upfront
          and get extra visits free. Credits stay on your account and never
          expire, redeemed one at a time whenever you book that dog for that
          service.
        </p>
        {!pets || pets.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Groom packs are for dogs right now. Add a dog to the pet profile
            to buy one.{" "}
            <Link href="/account/pets/new" className="text-accent-dark hover:underline">
              Add a pet
            </Link>
          </p>
        ) : (
          <div className="mt-4">
            <GroomPackPicker pets={pets} action={purchaseGroomPack} config={config} />
          </div>
        )}
      </RevealOnScroll>

      <RevealOnScroll delay={300} className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          How memberships work
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-muted">
          <li>
            <span className="font-medium text-foreground/90">
              The groom itself is priced normally.
            </span>{" "}
            Each tier includes one monthly appointment at that tier&apos;s
            service level (Bath, Trim, or Full Groom), priced the same as
            booking à la carte for your dog&apos;s weight and coat.
            Membership doesn&apos;t discount the groom, it unlocks the perks
            below. Additional appointments that month are booked and priced
            separately, as usual.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              One membership per dog.
            </span>{" "}
            Enroll each dog separately. Memberships are for dogs only. Cats
            aren&apos;t eligible right now.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              Priority booking.
            </span>{" "}
            Members get first pick of open appointment times.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              {config.memberAddonDiscountPercent}% off add-on bundles.
            </span>{" "}
            Optional bundles (teeth brushing, nail grinding, and more) are
            available at a member-only discount, on top of your monthly
            groom.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              {config.memberAddonDiscountPercent}% off individual
              add-ons.
            </span>{" "}
            Prefer to pick and choose instead of a bundle? Every individual
            add-on is also available to members at a discount, and can be
            added right when you join above.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              Billed online, cancel anytime.
            </span>{" "}
            Memberships are paid online only. No long-term contract, cancel
            whenever you&apos;d like.
          </li>
        </ul>
      </RevealOnScroll>

      <RevealOnScroll delay={400} className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          How pre-purchases work
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-muted">
          <li>
            <span className="font-medium text-foreground/90">
              Priced at your dog&apos;s own rate.
            </span>{" "}
            A pack is priced using that specific dog&apos;s Bath or Full
            Groom rate based on weight and coat, the same as booking à la
            carte. Bath and Full Groom credits aren&apos;t interchangeable.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              Buy 5, get 1 free, or buy 9, get 3 more free.
            </span>{" "}
            Pick whichever pack size fits how often you visit.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              Credits never expire.
            </span>{" "}
            They stay on your account and are redeemed one at a time,
            whenever you book that dog for that same service.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              Credits cover the base groom only.
            </span>{" "}
            De-shed treatment, creative color, add-ons, bundles, and pickup
            &amp; drop-off still cost extra at booking, same as normal.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              Add a bundle or add-ons at purchase, optional.
            </span>{" "}
            If that dog already has an active membership, your member
            discount applies to anything added to the pack.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              One-time payment, no subscription.
            </span>{" "}
            Pay once online for the whole pack. No membership required to
            buy one.
          </li>
        </ul>
      </RevealOnScroll>
    </div>
  );
}
