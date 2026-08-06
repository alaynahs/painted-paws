"use server";

import { createClient } from "@/lib/supabase/server";

export async function logPageView(path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("page_views").insert({
    customer_id: user.id,
    path,
  });
}
