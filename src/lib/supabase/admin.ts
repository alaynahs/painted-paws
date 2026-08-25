import { redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/supabase/current-user";

/**
 * Verifies the current user is logged in and has the admin role. Redirects
 * home otherwise. Use at the top of any /admin page.
 */
export async function requireAdmin() {
  const { supabase, user, role } = await getCurrentUserWithRole();
  if (!user) redirect("/login");
  if (role !== "admin") redirect("/");

  return { supabase, user };
}
