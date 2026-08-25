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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, user, role: profile?.role ?? null };
});
