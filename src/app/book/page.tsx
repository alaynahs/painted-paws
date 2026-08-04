import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingFlow from "@/components/booking-flow";
import { isBlockedFromOnlineBooking } from "@/app/book/actions";
import { getPricingConfig } from "@/lib/pricing/config";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
          Book an appointment
        </p>
        <h1 className="mt-3 font-serif text-3xl text-foreground">
          Let&apos;s get you set up
        </h1>
        <p className="mt-4 text-muted">
          Log in or create a free account to book. It&apos;s where we keep
          your pet&apos;s info on file so you never have to re-enter it.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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

  if (await isBlockedFromOnlineBooking(supabase, user.id)) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
          Book an appointment
        </p>
        <h1 className="mt-3 font-serif text-3xl text-foreground">
          Please email to book
        </h1>
        <p className="mt-4 text-muted">
          Online booking isn&apos;t available for this account right now.
          Please email us to book your next appointment.
        </p>
        <a
          href="mailto:booking@paintedpawsaustin.com"
          className="mt-8 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Email booking@paintedpawsaustin.com
        </a>
      </div>
    );
  }

  const { data: pets } = await supabase
    .from("pets")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .eq("do_not_book", false)
    .order("created_at", { ascending: true });

  const config = await getPricingConfig();

  if (!pets || pets.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
          Book an appointment
        </p>
        <h1 className="mt-3 font-serif text-3xl text-foreground">
          Add your pet first
        </h1>
        <p className="mt-4 text-muted">
          You&apos;ll need a saved pet profile before booking. It&apos;s a
          one-time step.
        </p>
        <Link
          href="/account/pets/new"
          className="mt-8 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Add a Pet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Book an appointment
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Reserve a Spot
      </h1>

      {error && (
        <p className="mt-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      <div className="mt-8">
        <BookingFlow pets={pets} config={config} />
      </div>
    </div>
  );
}
