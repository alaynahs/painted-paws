const HOME_LAT = 30.424023;
const HOME_LON = -97.653714;

// Straight-line miles standing in for a ~15 minute drive around Pflugerville's
// suburban road network (actual driving distance runs longer than straight-line).
export const PICKUP_RADIUS_MILES = 7;

const NOMINATIM_USER_AGENT = "PaintedPawsAustin/1.0 (booking@paintedpawsaustin.com)";

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeOnce(address: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

// Unit/apt/suite numbers frequently make the free-text lookup fail to match
// anything, so retry without them before giving up on the address entirely.
function stripUnitDesignators(address: string): string {
  return address
    .replace(/\b(unit|apt|apartment|suite|ste|#)\.?\s*[\w-]+/gi, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const direct = await geocodeOnce(address);
  if (direct) return direct;
  const stripped = stripUnitDesignators(address);
  if (stripped && stripped !== address) {
    return geocodeOnce(stripped);
  }
  return null;
}

export type PickupEligibility =
  | { status: "eligible"; distanceMiles: number }
  | { status: "ineligible"; distanceMiles: number }
  | { status: "unknown" };

export async function checkPickupEligibility(address: string): Promise<PickupEligibility> {
  const trimmed = address.trim();
  if (!trimmed) return { status: "unknown" };
  const coords = await geocodeAddress(trimmed);
  // Can't verify the distance at all — never silently allow this through.
  // Treat it the same as out-of-range so the customer is told to email instead.
  if (!coords) return { status: "unknown" };
  const distanceMiles = haversineMiles(HOME_LAT, HOME_LON, coords.lat, coords.lon);
  return distanceMiles <= PICKUP_RADIUS_MILES
    ? { status: "eligible", distanceMiles }
    : { status: "ineligible", distanceMiles };
}
