import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// The root layout (isCurrentUserAdmin, for nav display) and every /admin
// page (requireAdmin, for actual access control) both need "who's logged
// in and are they admin" — without this, that meant two full, independent
// getUser()-then-profile-lookup round trips per page load instead of one.
// Wrapped in React's cache() (same pattern as getPricingConfig) so
// multiple calls within a single request's render dedupe to a single
// actual network round trip.
export const getCurrentUserWithRole = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, role: null as string | null };

  // The profile-role lookup previously ignored query errors outright, so a
  // single slow/flaky round trip (Supabase and Vercel are in different
  // regions) silently read as "not admin" with no way to tell that apart
  // from actually not being admin. One immediate retry absorbs a transient
  // blip instead of hiding admin access for the rest of the request.
  let profile: { role: string | null } | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!error) {
      profile = data;
      break;
    }
    lastError = error;
  }

  if (!profile && lastError) {
    console.error("getCurrentUserWithRole: profile lookup failed twice", lastError);
  }

  return { supabase, user, role: profile?.role ?? null };
});
