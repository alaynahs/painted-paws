import { centralWallClockToInstant } from "@/lib/format";

export const GIVEAWAY_DEADLINE_ISO = centralWallClockToInstant(
  "2026-09-25",
  23,
  59,
).toISOString();

export function isGiveawayActive(): boolean {
  return new Date(GIVEAWAY_DEADLINE_ISO).getTime() > Date.now();
}
