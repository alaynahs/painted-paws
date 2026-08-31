// The groomer's own reusable reference for how she grooms a given pet —
// separate from a customer's one-off per-visit haircut request. Stored as
// a single JSONB column on pets (same reasoning as pricing_config being
// one JSONB row instead of a dozen columns).
export const GROOM_RECIPE_FIELDS = [
  "body",
  "face",
  "ears",
  "legsArms",
  "feetPaws",
  "tail",
  "sanitary",
  "nails",
  "shampoo",
  "conditioner",
  "drying",
  "finishing",
] as const;

export type GroomRecipeField = (typeof GROOM_RECIPE_FIELDS)[number];

export type GroomRecipe = Partial<Record<GroomRecipeField, string>>;

export const GROOM_RECIPE_LABELS: Record<GroomRecipeField, string> = {
  body: "Body",
  face: "Face",
  ears: "Ears",
  legsArms: "Legs / Arms",
  feetPaws: "Feet / Paws",
  tail: "Tail",
  sanitary: "Sanitary",
  nails: "Nails",
  shampoo: "Shampoo",
  conditioner: "Conditioner",
  drying: "Drying",
  finishing: "Finishing",
};

// A stored recipe might predate a field being added, or have come back
// from the DB as {} — never trust it has every key.
export function normalizeGroomRecipe(value: unknown): GroomRecipe {
  const recipe = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const result: GroomRecipe = {};
  for (const field of GROOM_RECIPE_FIELDS) {
    const v = recipe[field];
    if (typeof v === "string" && v.trim()) result[field] = v.trim();
  }
  return result;
}
