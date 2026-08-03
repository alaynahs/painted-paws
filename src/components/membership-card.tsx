import {
  MEMBERSHIP_TIER_LABELS,
  monthsSince,
  PACKAGE_LABELS,
  type MembershipTier,
  type PackageTier,
} from "@/lib/pricing/pricing";
import { cancelMembership } from "@/app/membership/actions";
import { formatDate } from "@/lib/format";

export default function MembershipCard({
  membership,
  showCancel = true,
}: {
  membership: {
    id: string;
    tier: MembershipTier;
    started_at: string;
    addon_bundle?: string | null;
    addon_names?: string[] | null;
    payment_method?: "online" | "in_person" | null;
    pets?: { name: string } | null;
  };
  showCancel?: boolean;
}) {
  const months = monthsSince(membership.started_at);

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="font-serif text-base text-foreground">
        {membership.pets?.name ?? "Pet"} ·{" "}
        {MEMBERSHIP_TIER_LABELS[membership.tier]}
      </p>
      <p className="mt-1 text-xs text-muted">
        Member since {formatDate(membership.started_at)} ({months} month
        {months === 1 ? "" : "s"})
      </p>
      {membership.addon_bundle && (
        <p className="mt-1 text-xs text-muted">
          Bundle: {PACKAGE_LABELS[membership.addon_bundle as PackageTier]}
        </p>
      )}
      {membership.addon_names && membership.addon_names.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          Add-ons: {membership.addon_names.join(", ")}
        </p>
      )}
      {membership.payment_method && (
        <p className="mt-1 text-xs text-muted">
          Payment:{" "}
          {membership.payment_method === "online"
            ? "Online"
            : "In person (Square)"}
        </p>
      )}
      {showCancel && (
        <form action={cancelMembership.bind(null, membership.id)} className="mt-2">
          <button
            type="submit"
            className="text-xs text-muted hover:text-foreground"
          >
            Cancel membership
          </button>
        </form>
      )}
    </div>
  );
}
