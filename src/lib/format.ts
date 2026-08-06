export function formatHour(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour;
  return `${display}:00 ${period}`;
}

export function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes < 1) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

// The business operates in Central time, but the server rendering this
// page doesn't necessarily run there (Vercel's functions typically default
// to UTC) — every formatter below pins "America/Chicago" explicitly so the
// displayed time is correct regardless of the server's own timezone.

export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  });
}

// Given a timestamptz ISO string, returns its calendar date (YYYY-MM-DD) as
// observed in Central time — safe to feed into formatDate() above. Slicing
// a UTC ISO string's first 10 characters directly can land on the wrong
// day (e.g. 11pm Central on the 4th is already 4am UTC on the 5th).
export function centralDateOnly(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// "Today" as the business (in Central time) would call it — not the
// server's own calendar date. Without this, every "is this appointment
// upcoming or past" check goes wrong for roughly 7pm-midnight Central each
// day, since UTC has already rolled over to the next date by then.
export function todayInCentral(): string {
  return centralDateOnly(new Date().toISOString());
}

// How far Central time trails UTC, in milliseconds, at a given instant —
// positive during both CDT (5h) and CST (6h), since Central is always
// behind UTC. Computed via Intl rather than a hardcoded offset so it
// tracks the DST transition automatically.
function centralOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asIfUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return instant.getTime() - asIfUtcMs;
}

// Appointment times are always a Central wall-clock hour (the business's
// own timezone) — this builds the correct absolute instant for that
// wall-clock moment regardless of the server's own timezone. Building it
// with plain `new Date(\`${date}T${hour}:00:00\`)` is a real bug: with no
// timezone attached, JS parses that string using the *server's* local
// timezone (UTC on Vercel), silently treating a 2pm Central slot as 2pm
// UTC — 5 hours off, which can make a genuinely upcoming same-day slot
// look like it's already passed.
export function centralWallClockToInstant(date: string, hour: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, 0, 0);
  const offset = centralOffsetMs(new Date(naiveUtcMs));
  return new Date(naiveUtcMs + offset);
}
