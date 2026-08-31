"use client";

import { useEffect, useState } from "react";

function formatElapsed(sinceMs: number): string {
  const totalMinutes = Math.max(0, Math.floor((Date.now() - sinceMs) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// A live "how long has this pet been here" readout — purely client-side,
// derived from the stored check-in timestamp, no polling needed.
export default function ElapsedTimer({ since }: { since: string }) {
  const sinceMs = new Date(since).getTime();
  const [label, setLabel] = useState(() => formatElapsed(sinceMs));

  useEffect(() => {
    const interval = setInterval(() => setLabel(formatElapsed(sinceMs)), 30_000);
    return () => clearInterval(interval);
  }, [sinceMs]);

  return <span>{label}</span>;
}
