import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireAdmin } from "@/lib/supabase/admin";
import {
  centralDateOnly,
  centralWallClockToInstant,
  formatDate,
  formatHour,
} from "@/lib/format";

function one<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

interface NotificationRow {
  sent_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
  pets: { name: string } | null;
}

interface CancellationRow {
  appointment_date: string;
  appointment_hour: number;
  cancelled_at: string | null;
  no_show: boolean;
  profiles: { full_name: string | null; phone: string | null } | null;
  pets: { name: string } | null;
}

function renderPdf(
  title: string,
  rows: { heading: string; subheading: string }[],
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(18).fillColor("#000").text(title, { underline: true });
  doc.moveDown();

  if (rows.length === 0) {
    doc.fontSize(11).text("Nothing to show.");
  }
  for (const row of rows) {
    doc.fontSize(11).fillColor("#000").text(row.heading);
    doc.fontSize(9).fillColor("#666").text(row.subheading);
    doc.moveDown(0.6);
  }

  doc.end();
  return done;
}

// Full lists behind the "download PDF" link once a Follow-Up Log section
// passes 5 entries on-screen — pdfkit renders server-side without a
// headless browser, so it works in Vercel's serverless functions.
export async function GET(request: NextRequest) {
  const { supabase } = await requireAdmin();
  const type = request.nextUrl.searchParams.get("type");

  let title: string;
  let filename: string;
  let rows: { heading: string; subheading: string }[];

  if (type === "rebooking_8wk" || type === "rebooking_16wk") {
    title = type === "rebooking_8wk" ? "8-Week Lapse" : "16-Week Lapse";
    filename = type === "rebooking_8wk" ? "8-week-lapse.pdf" : "16-week-lapse.pdf";

    const { data } = await supabase
      .from("notifications_log")
      .select("sent_at, profiles:customer_id(full_name, phone), pets:pet_id(name)")
      .eq("type", type)
      .order("sent_at", { ascending: false })
      .limit(500);

    rows = ((data ?? []) as unknown as NotificationRow[]).map((r) => {
      const profile = one(r.profiles);
      const pet = one(r.pets);
      return {
        heading: `${profile?.full_name ?? "Unknown"}${pet?.name ? " · " + pet.name : ""}`,
        subheading: `${profile?.phone ?? "No phone on file"} · Sent ${formatDate(centralDateOnly(r.sent_at))}`,
      };
    });
  } else if (type === "cancellations") {
    const weekStartParam = request.nextUrl.searchParams.get("start");
    if (!weekStartParam) {
      return NextResponse.json({ error: "Missing start" }, { status: 400 });
    }
    const weekEnd = addDays(weekStartParam, 6);
    const rangeStartInstant = centralWallClockToInstant(weekStartParam, 0).toISOString();
    const rangeEndInstant = centralWallClockToInstant(addDays(weekEnd, 1), 0).toISOString();

    title = `Cancellations: ${formatDate(weekStartParam)} – ${formatDate(weekEnd)}`;
    filename = `cancellations-${weekStartParam}.pdf`;

    const { data } = await supabase
      .from("appointments")
      .select(
        "appointment_date, appointment_hour, cancelled_at, no_show, profiles:customer_id(full_name, phone), pets(name)",
      )
      .eq("status", "cancelled")
      .gte("cancelled_at", rangeStartInstant)
      .lt("cancelled_at", rangeEndInstant)
      .order("cancelled_at", { ascending: false })
      .limit(500);

    rows = ((data ?? []) as unknown as CancellationRow[]).map((r) => {
      const profile = one(r.profiles);
      const pet = one(r.pets);
      const cancelledPart = r.cancelled_at
        ? ` · Cancelled ${formatDate(centralDateOnly(r.cancelled_at))}`
        : "";
      return {
        heading: `${profile?.full_name ?? "Unknown"}${pet?.name ? " · " + pet.name : ""}${r.no_show ? " (No-show)" : ""}`,
        subheading: `${profile?.phone ?? "No phone on file"} · Was booked for ${formatDate(r.appointment_date)} at ${formatHour(r.appointment_hour)}${cancelledPart}`,
      };
    });
  } else {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  const pdfBuffer = await renderPdf(title, rows);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
