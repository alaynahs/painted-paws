import QuickMessageButtons from "@/components/quick-message-buttons";
import { sendQuickMessage } from "@/app/admin/actions";
import { PayLinkIcon, CarIcon, ClockIcon } from "@/components/stage-icons";

const tileClass =
  "flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-3 text-center text-foreground/80 transition-colors hover:border-accent-dark hover:text-accent-dark";

// One-tap versions of the two most common quick messages, promoted out of
// the "Message" dropdown for a faster tap during a busy day — the full set
// (on my way, can't reach, etc.) is still reachable from the Message tile.
function QuickFireTile({
  appointmentId,
  type,
  icon,
  label,
}: {
  appointmentId: string;
  type: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <form action={sendQuickMessage}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="extra" value="" />
      <button type="submit" className={tileClass}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </button>
    </form>
  );
}

export default function QuickActionTiles({
  appointmentId,
}: {
  appointmentId: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <QuickMessageButtons appointmentId={appointmentId} tile />
      <a href="#payment-section" className={tileClass}>
        <PayLinkIcon className="h-5 w-5" />
        <span className="text-xs font-medium">Send Pay Link</span>
      </a>
      <QuickFireTile
        appointmentId={appointmentId}
        type="pickup_ready"
        icon={<CarIcon className="h-5 w-5" />}
        label="Ready for Pickup"
      />
      <QuickFireTile
        appointmentId={appointmentId}
        type="pickup_15min"
        icon={<ClockIcon className="h-5 w-5" />}
        label="Ready in 15 Min"
      />
    </div>
  );
}
