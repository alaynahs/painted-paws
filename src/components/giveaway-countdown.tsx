"use client";

import { useEffect, useState } from "react";

function timeLeft(deadlineMs: number) {
  const diff = Math.max(0, deadlineMs - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { diff, days, hours, minutes, seconds };
}

export default function GiveawayCountdown({
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

  if (left.diff <= 0) {
    return (
      <p className="mt-6 text-sm font-medium text-accent-dark">
        Entries are closed.
      </p>
    );
  }

  return (
    <p className="mt-6 text-sm font-medium text-accent-dark">
      ⏳ {left.days}d {left.hours}h {left.minutes}m {left.seconds}s left to
      enter
    </p>
  );
}
