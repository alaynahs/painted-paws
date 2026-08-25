import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Temporary diagnostic route — times a trivial Supabase query from inside
// Vercel's own infrastructure, to see real production Vercel-to-Supabase
// latency rather than guessing from a local machine's network path.
// Returns no sensitive data, just timing numbers. Delete after use.
export async function GET() {
  const supabase = createServiceClient();

  const start1 = Date.now();
  await supabase.from("pets").select("id").limit(1);
  const query1ms = Date.now() - start1;

  const start2 = Date.now();
  await supabase.from("pets").select("id").limit(1);
  const query2ms = Date.now() - start2;

  const start3 = Date.now();
  await supabase.auth.getUser();
  const authMs = Date.now() - start3;

  return NextResponse.json({
    query1ms,
    query2ms,
    authMs,
    region: process.env.VERCEL_REGION ?? "unknown",
  });
}
