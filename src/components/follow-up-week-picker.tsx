"use client";

import { useRouter } from "next/navigation";
import DatePickerCalendar from "@/components/date-picker-calendar";

// Picking any single day jumps the Cancellations log to the 7-day window
// starting that day — handled by the page itself re-reading `start` from
// the URL, this component only needs to navigate there.
export default function FollowUpWeekPicker({ start }: { start: string }) {
  const router = useRouter();

  return (
    <div className="mt-3 max-w-xs">
      <DatePickerCalendar
        value={start}
        onChange={(date) => router.push(`/admin/follow-ups?start=${date}`)}
      />
    </div>
  );
}
