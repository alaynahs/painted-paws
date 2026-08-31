import type { ReactNode } from "react";

// A native <details> card — no client JS needed. Used for the secondary,
// occasionally-touched sections (notes, photos, membership) so the page
// reads shorter by default without losing anything; the frequently-needed
// stuff (recipe, price, stage tracker, vaccine) stays plainly visible.
export default function CollapsibleCard({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-border bg-card p-5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium uppercase tracking-wide text-accent-dark [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-2 text-xs normal-case text-muted">
          {count !== undefined && <span>{count}</span>}
          <span className="inline-block transition-transform group-open:rotate-90">
            ›
          </span>
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
