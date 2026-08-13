import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
  appointment_minute: number;
  cancelled_at: string | null;
  no_show: boolean;
  profiles: { full_name: string | null; phone: string | null } | null;
  pets: { name: string } | null;
}

// pdf-lib's standard 14 fonts (Helvetica) have their character-width
// metrics compiled directly into the library, not read from an external
// font file at runtime — pdfkit's approach does the latter, which is why
// the first version of this route produced blank pages: Vercel's
// serverless bundler didn't include pdfkit's font asset files, so no text
// ever actually rendered even though a structurally valid PDF came back.
async function renderPdf(
  title: string,
  rows: { heading: string; subheading: string }[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const lineHeight = 16;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function drawLine(text: string, size: number, useFont = font, gray = 0) {
    if (y < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(text, { x: margin, y, size, font: useFont, color: rgb(gray, gray, gray) });
    y -= lineHeight;
  }

  drawLine(title, 18, fontBold);
  y -= 10;

  if (rows.length === 0) {
    drawLine("Nothing to show.", 11);
  }
  for (const row of rows) {
    drawLine(row.heading, 11, font, 0);
    drawLine(row.subheading, 9, font, 0.4);
    y -= 8;
  }

  return pdfDoc.save();
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
        "appointment_date, appointment_hour, appointment_minute, cancelled_at, no_show, profiles:customer_id(full_name, phone), pets(name)",
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
        subheading: `${profile?.phone ?? "No phone on file"} · Was booked for ${formatDate(r.appointment_date)} at ${formatHour(r.appointment_hour, r.appointment_minute)}${cancelledPart}`,
      };
    });
  } else {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  const pdfBytes = await renderPdf(title, rows);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
