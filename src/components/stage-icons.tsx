// Small, simple line icons for the stage tracker and quick-action tiles —
// matching the minimal geometric style of PawIcon rather than pulling in an
// icon library for a handful of glyphs.

function Base({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function CheckInIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M9 4h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9" />
      <path d="M3 12h12" />
      <path d="M11 8l4 4-4 4" />
    </Base>
  );
}

export function ScissorsIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8 7.5l12 9" />
      <path d="M8 16.5l12-9" />
    </Base>
  );
}

export function ReadyIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </Base>
  );
}

export function CheckoutIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M4 6h2l1.5 10.5a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.8L20 9H7" />
      <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function MessageIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M4 5h16v11H9l-4 4V5z" />
    </Base>
  );
}

export function PayLinkIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M3 10h18" />
    </Base>
  );
}

export function CarIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M4 16v-3l2-4.5A1.5 1.5 0 0 1 7.4 7.5h9.2a1.5 1.5 0 0 1 1.4 1l2 4.5v3" />
      <path d="M4 16h16" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </Base>
  );
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Base>
  );
}
