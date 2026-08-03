import { createClient } from "@/lib/supabase/server";

// Non-redirecting admin check for layout/nav rendering, where we need a
// plain boolean to decide what to show — unlike requireAdmin() in
// @/lib/supabase/admin, which redirects and is for actual admin pages.
export async function isCurrentUserAdmin(): Promise<boolean> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return false;
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    return profile?.role === "admin";
  } catch {
    return false;
  }
}
