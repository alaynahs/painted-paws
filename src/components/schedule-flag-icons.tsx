// Small stackable status flags shown on grid blocks (src/components/
// admin-schedule-grid.tsx) and explained in the legend at the bottom of
// /admin/grid — kept in one place so the badge and its legend entry can
// never drift out of sync on icon, color, or label.
import type { SVGProps } from "react";

function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2c.6 3.7 2.3 5.4 6 6-3.7.6-5.4 2.3-6 6-.6-3.7-2.3-5.4-6-6 3.7-.6 5.4-2.3 6-6Z" />
      <path d="M19 15c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7Z" />
    </svg>
  );
}

function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 20.3 4.6 13c-2.1-2.1-2.1-5.5 0-7.6 2.1-2 5.4-2 7.4.2 2-2.2 5.3-2.2 7.4-.2 2.1 2.1 2.1 5.5 0 7.6L12 20.3Z" />
    </svg>
  );
}

function HealthCrossIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5V3Z" />
    </svg>
  );
}

function CatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5 3.5c1.8.6 3.1 1.8 3.9 3.4a8.2 8.2 0 0 1 6.2 0c.8-1.6 2.1-2.8 3.9-3.4-.4 1.9-.3 3.5.4 4.9A7.5 7.5 0 0 1 21 14.5c0 4.4-4 7-9 7s-9-2.6-9-7c0-2.6.9-4.8 2.6-6.1.7-1.4.8-3 .4-4.9Z" />
    </svg>
  );
}

function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function SyringeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m19 3 2 2" />
      <path d="m17 5 2 2" />
      <path d="M15 7 4.5 17.5 3 21l3.5-1.5L17 9" />
      <path d="m13 5 6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

export type ScheduleFlagKey =
  | "requested"
  | "cat"
  | "newCustomer"
  | "senior"
  | "healthConcerns"
  | "vaccineNeeded";

export const SCHEDULE_FLAGS: {
  key: ScheduleFlagKey;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  text: string;
  bg: string;
  // Saturated fill for the block's left-edge stripe — the pale `bg` tint
  // above reads fine behind a small icon, but disappears as a thin line.
  stripe: string;
}[] = [
  {
    key: "requested",
    label: "Awaiting confirmation",
    Icon: ClockIcon,
    // Matches the existing "Req" status pill's own colors exactly, rather
    // than a generic blue, since this flag is that same status — just
    // folded into the same stackable system as the others.
    text: "text-accent-dark",
    bg: "bg-accent-tint",
    stripe: "bg-accent",
  },
  {
    key: "cat",
    label: "Cat",
    Icon: CatIcon,
    text: "text-teal-600",
    bg: "bg-teal-100",
    stripe: "bg-teal-500",
  },
  {
    key: "newCustomer",
    label: "New customer",
    Icon: SparkleIcon,
    text: "text-pink-600",
    bg: "bg-pink-100",
    stripe: "bg-pink-500",
  },
  {
    key: "senior",
    label: "Senior dog (7+ yrs)",
    Icon: HeartIcon,
    text: "text-purple-600",
    bg: "bg-purple-100",
    stripe: "bg-purple-500",
  },
  {
    key: "healthConcerns",
    label: "Health concerns on file",
    Icon: HealthCrossIcon,
    text: "text-orange-600",
    bg: "bg-orange-100",
    stripe: "bg-orange-500",
  },
  {
    key: "vaccineNeeded",
    label: "Rabies vaccine needed",
    Icon: SyringeIcon,
    text: "text-red-600",
    bg: "bg-red-100",
    stripe: "bg-red-500",
  },
];
