import {
  GROOM_RECIPE_FIELDS,
  GROOM_RECIPE_LABELS,
  type GroomRecipe,
} from "@/lib/groom-recipe";
import { updateGroomRecipe } from "@/app/admin/actions";

// The groomer's own reusable reference for how she grooms this pet, e.g.
// blade length by area, shampoo/conditioner picks, finishing touches — a
// quick-scan grid, not a paragraph to re-read every visit.
export default function GroomingRecipeCard({
  petId,
  recipe,
}: {
  petId: string;
  recipe: GroomRecipe;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
          Grooming Recipe
        </h2>
      </div>
      <form action={updateGroomRecipe} className="mt-3">
        <input type="hidden" name="petId" value={petId} />
        <div className="grid grid-cols-2 gap-3">
          {GROOM_RECIPE_FIELDS.map((field) => (
            <div key={field}>
              <label
                htmlFor={`recipe-${field}`}
                className="text-[10px] font-medium uppercase tracking-wide text-muted"
              >
                {GROOM_RECIPE_LABELS[field]}
              </label>
              <input
                id={`recipe-${field}`}
                name={field}
                type="text"
                defaultValue={recipe[field] ?? ""}
                placeholder="—"
                className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent-dark"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="mt-4 w-full rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Save Recipe
        </button>
      </form>
    </section>
  );
}
