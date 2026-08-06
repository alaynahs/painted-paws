"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DatePickerCalendar from "@/components/date-picker-calendar";

// Picking any single day jumps the Cancellations log to the 7-day window
// starting that day — handled by the page itself re-reading `start` from
// the URL, this component only needs to navigate there. Shown as a
// toggled popover rather than always inline, since the calendar is much
// narrower than the card it sits in and looked like wasted blank space
// sitting there permanently.
export default function FollowUpWeekPicker({ start }: { start: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mt-3 inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
      >
        📅 Pick a different week
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-2">
          <DatePickerCalendar
            value={start}
            onChange={(date) => {
              setOpen(false);
              router.push(`/admin/follow-ups?start=${date}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
