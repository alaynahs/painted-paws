"use server";

import { createClient } from "@/lib/supabase/server";

export async function logPageView(path: string, visitorId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !visitorId) return;

  await supabase.from("page_views").insert(
    user
      ? { customer_id: user.id, path }
      : { visitor_id: visitorId, path },
  );
}
