// Keeps a customer logged in across browser restarts instead of just for
// the current browser session. 400 days is the practical cap browsers
// enforce on cookie lifetime (Chrome, notably) — Supabase's own default
// already matches this, but it's pinned here explicitly across all three
// client factories (browser, server, middleware) so it can't silently
// change with a library update.
export const AUTH_COOKIE_OPTIONS = {
  maxAge: 400 * 24 * 60 * 60,
};
