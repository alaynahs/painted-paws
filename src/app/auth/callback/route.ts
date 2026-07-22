import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point for Supabase auth email links (password reset, email
// confirmation) — exchanges the one-time code in the link for a real
// session, then continues on to wherever the link was meant to go.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "That link is invalid or has expired — please try again.",
    )}`,
  );
}
