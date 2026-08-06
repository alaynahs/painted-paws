const COOKIE_NAME = "pp_visitor_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// A stable per-browser ID for logged-out visitors, since there's no
// auth.uid() to attribute anonymous analytics rows to otherwise. Client-only
// (reads/writes document.cookie) — call from a useEffect, not during render.
export function getOrCreateVisitorId(): string {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
  );
  if (match) return decodeURIComponent(match[1]);

  const id = crypto.randomUUID();
  document.cookie = `${COOKIE_NAME}=${id}; max-age=${ONE_YEAR_SECONDS}; path=/; samesite=lax`;
  return id;
}
