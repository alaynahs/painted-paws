"use client";

import { useEffect, useRef } from "react";

// Best-effort "how long was this visit" tracker, site-wide. Fires once per
// tab session, via sendBeacon so it still goes out during page unload
// (a normal fetch call in a pagehide/unload handler is not reliable).
export default function SessionDurationTracker() {
  const startedAt = useRef<number | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();

    function sendDuration() {
      if (sent.current || startedAt.current === null) return;
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      if (seconds < 1) return;
      sent.current = true;
      navigator.sendBeacon(
        "/api/analytics/session-duration",
        new Blob([JSON.stringify({ seconds })], { type: "application/json" }),
      );
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") sendDuration();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", sendDuration);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", sendDuration);
    };
  }, []);

  return null;
}
