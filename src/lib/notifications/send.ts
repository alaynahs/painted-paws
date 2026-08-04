import { Resend } from "resend";
import Twilio from "twilio";
import { BUSINESS_NAME } from "./templates";
import { renderEmailHtml } from "./email-theme";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Plain-text clients don't understand "[label](url)" markdown links, so
// spell it out as "label: url" there instead.
function markdownLinksToPlainText(text: string) {
  return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2");
}

// Twilio API Key auth: the key SID/secret authenticate the request, but
// every call still needs to know which account it's acting on.
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_API_KEY_SID &&
  process.env.TWILIO_API_KEY_SECRET
    ? Twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
      })
    : null;

export async function sendEmail(
  to: string | null | undefined,
  subject: string,
  body: string,
): Promise<"sent" | "failed" | "skipped"> {
  if (!resend || !to) {
    console.warn(
      `[notifications] Email skipped (Resend not configured, or no address): "${subject}" -> ${to ?? "none"}`,
    );
    return "skipped";
  }
  try {
    // Resend's SDK doesn't throw for API-level rejections (invalid from
    // address, unverified domain, etc.) — it returns them in `error`
    // instead, so a try/catch alone silently treats every rejection as
    // a success unless this is checked explicitly.
    //
    // .trim() guards against a stray trailing space/newline getting pasted
    // in alongside the address (same class of bug hit with STRIPE_SECRET_KEY
    // and CRON_SECRET) — untrimmed, that whitespace breaks the "Name <email>"
    // format Resend validates against, rejecting every single send.
    const from =
      process.env.NOTIFICATIONS_FROM_EMAIL?.trim() ||
      `${BUSINESS_NAME} <onboarding@resend.dev>`;
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      text: markdownLinksToPlainText(body),
      html: renderEmailHtml(subject, body),
    });
    if (error) {
      console.error("[notifications] Email send rejected by Resend", error);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[notifications] Email send failed", err);
    return "failed";
  }
}

export async function sendText(
  to: string | null | undefined,
  body: string,
): Promise<"sent" | "failed" | "skipped"> {
  if (!twilioClient || !process.env.TWILIO_FROM_NUMBER || !to) {
    console.warn(
      `[notifications] SMS skipped (Twilio not configured, or no number) -> ${to ?? "none"}`,
    );
    return "skipped";
  }
  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to,
      body,
    });
    return "sent";
  } catch (err) {
    console.error("[notifications] SMS send failed", err);
    return "failed";
  }
}
