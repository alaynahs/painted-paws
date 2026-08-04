import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AuthStatus({
  className,
  mobile = false,
}: {
  className?: string;
  mobile?: boolean;
}) {
  let signedIn = false;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      signedIn = !!data.user;
    } catch {
      signedIn = false;
    }
  }

  if (signedIn) {
    return (
      <Link href="/account" className={className}>
        My Account
      </Link>
    );
  }

  // Styled identically to "Book Now" (same classes, same color, same
  // size) rather than plain nav text, since this is the site's primary
  // login/signup call to action.
  return (
    <Link
      href="/login"
      className={
        mobile
          ? "rounded-full bg-accent px-5 py-3 text-center text-sm font-medium text-white"
          : "shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark lg:px-5 lg:py-2 lg:text-base"
      }
    >
      Log In / Sign Up
    </Link>
  );
}
