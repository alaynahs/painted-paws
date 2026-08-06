import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hit via navigator.sendBeacon on page unload — best effort, always 200s
// so the browser doesn't retry/log a failed beacon.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const seconds = Number(body?.seconds);

  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 24 * 60 * 60) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true });

  await supabase.from("site_session_durations").insert({
    customer_id: user.id,
    duration_seconds: Math.round(seconds),
  });

  return NextResponse.json({ ok: true });
}
