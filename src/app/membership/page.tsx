import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { joinMembership } from "@/app/membership/actions";
import MembershipCard from "@/components/membership-card";
import MembershipTierPicker from "@/components/membership-tier-picker";
import RevealOnScroll from "@/components/reveal-on-scroll";

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
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:border-accent-dark hover:text-accent-dark"
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
    .select("id, name, breed, species, weight_lb, coat")
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Memberships
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Monthly Memberships
      </h1>
      <p className="mt-3 text-muted">
        For regulars — lock in priority booking and discounted add-ons, with a
        free service built in as you go.
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
            Memberships are for dogs right now — add a dog to your pet
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
            <MembershipTierPicker pets={availablePets} action={joinMembership} />
          </div>
        )}
      </RevealOnScroll>

      <RevealOnScroll delay={200} className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground">
          How memberships work
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-muted">
          <li>
            <span className="font-medium text-foreground/90">
              One grooming visit a month, at 10% off.
            </span>{" "}
            Each tier includes one appointment per month at that tier&apos;s
            service level (Bath, Trim, or Full Groom), discounted 10% off the
            regular price for your dog&apos;s weight and coat — additional
            appointments that month are booked and priced separately, as
            usual.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              One membership per dog.
            </span>{" "}
            Enroll each dog separately. Memberships are for dogs only — cats
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
              A free service, on a schedule.
            </span>{" "}
            Depending on your tier, every few months of membership earns your
            dog a completely free groom — see the exact cadence under each
            tier above.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              Discounted add-on bundles.
            </span>{" "}
            Optional bundles (teeth brushing, nail grinding, and more) are
            available at a member-only discount, on top of your monthly
            groom.
          </li>
          <li>
            <span className="font-medium text-foreground/90">
              Billed online, cancel anytime.
            </span>{" "}
            Memberships are paid online only — no long-term contract, cancel
            whenever you&apos;d like.
          </li>
        </ul>
      </RevealOnScroll>
    </div>
  );
}
