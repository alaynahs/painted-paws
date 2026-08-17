// Wraps a plain-text email body in the site's cream/blue branded shell.
// Email clients don't reliably render custom fonts, absolute-positioned
// decorations, or CSS variables, so this sticks to inline styles and a
// couple of paw/bubble emoji for the "matches the site" flourish.

import { BUSINESS_EMAIL } from "./templates";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Turns "[label](url)" or a bare URL in already-escaped text into a
// clickable link — markdown-style links get the custom label, bare URLs
// just link to themselves. Must be a single pass: running the "bare URL"
// replacement as a second, separate .replace() re-matches the URL that's
// now sitting inside the href="..." attribute just written by the first
// pass, producing a broken nested <a href="<a href="..."> tag that email
// clients render as plain, non-clickable text instead of a link.
function linkify(escapedText: string) {
  return escapedText.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s<)]+)\)|(https?:\/\/[^\s<]+)/g,
    (_match, label, markdownUrl, bareUrl) => {
      const url = markdownUrl ?? bareUrl;
      const text = markdownUrl ? label : bareUrl;
      return `<a href="${url}" style="color:#3a6d8a;">${text}</a>`;
    },
  );
}

function paragraphsToHtml(body: string) {
  return body
    .split("\n\n")
    .map((para) => {
      const lines = para.split("\n").filter((l) => l.length > 0);
      if (lines.length > 0 && lines.every((l) => l.trim().startsWith("•"))) {
        const items = lines
          .map(
            (l) =>
              `<li style="margin-bottom:6px;">${linkify(escapeHtml(l.trim().replace(/^•\s*/, "")))}</li>`,
          )
          .join("");
        return `<ul style="margin:0 0 18px;padding-left:20px;color:#2b2620;font-size:15px;line-height:1.5;">${items}</ul>`;
      }
      return `<p style="margin:0 0 18px;color:#2b2620;font-size:15px;line-height:1.6;">${lines
        .map((l) => linkify(escapeHtml(l)))
        .join("<br/>")}</p>`;
    })
    .join("\n");
}

export function renderEmailHtml(subject: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#faf8f4;">
    <div style="max-width:480px;margin:0 auto;padding:36px 16px;font-family:Georgia,'Times New Roman',serif;">
      <div style="text-align:center;margin-bottom:14px;font-size:20px;letter-spacing:6px;">🐾&nbsp;&nbsp;🫧&nbsp;&nbsp;🐾</div>
      <div style="background:#ffffff;border:1px solid #e7e1d6;border-radius:24px;padding:36px 30px;">
        <p style="margin:0 0 6px;text-align:center;font-size:24px;font-style:italic;color:#2b2620;">Painted Paws</p>
        <p style="margin:0 0 24px;text-align:center;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#3a6d8a;font-family:Arial,sans-serif;">
          ${escapeHtml(subject)}
        </p>
        <div style="margin-top:22px;font-family:Arial,sans-serif;">
          ${paragraphsToHtml(body)}
        </div>
      </div>
      <p style="text-align:center;margin:22px 0 0;font-size:12px;color:#6b6357;font-family:Arial,sans-serif;">
        Painted Paws · Boutique in-home dog grooming · Austin, TX<br/>
        <a href="mailto:${BUSINESS_EMAIL}" style="color:#3a6d8a;">${BUSINESS_EMAIL}</a>
      </p>
      <div style="text-align:center;margin-top:10px;font-size:16px;letter-spacing:6px;">🐾&nbsp;&nbsp;💛&nbsp;&nbsp;🐾</div>
    </div>
  </body>
</html>`;
}
