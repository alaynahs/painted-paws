import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AuthStatus({ className }: { className?: string }) {
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

  return (
    <Link href={signedIn ? "/account" : "/login"} className={className}>
      {signedIn ? "My Account" : "Log In"}
    </Link>
  );
}
