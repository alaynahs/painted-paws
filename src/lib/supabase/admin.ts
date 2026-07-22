import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies the current user is logged in and has the admin role. Redirects
 * home otherwise. Use at the top of any /admin page.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return { supabase, user };
}
