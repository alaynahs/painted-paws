"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PawIcon from "@/components/paw-icon";

function timeLeft(deadlineMs: number) {
  const diff = Math.max(0, deadlineMs - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { diff, days, hours, minutes, seconds };
}

export default function GiveawayBanner({
  deadlineIso,
}: {
  deadlineIso: string;
}) {
  const deadlineMs = new Date(deadlineIso).getTime();
  const [left, setLeft] = useState(() => timeLeft(deadlineMs));

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(deadlineMs)), 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);

  if (left.diff <= 0) return null;

  return (
    <Link
      href="/giveaway"
      className="flex items-center justify-center gap-2 bg-accent-dark px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-accent sm:text-base"
    >
      <PawIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
      <span>
        Win a Year of Free Grooms — {left.days}d {left.hours}h{" "}
        {left.minutes}m {left.seconds}s left to enter
      </span>
      <PawIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
    </Link>
  );
}
