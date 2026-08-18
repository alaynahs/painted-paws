"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Fires the Meta Pixel's "Schedule" conversion event the moment a customer
// lands back on /account after actually paying for a new booking — as
// opposed to the page-view-only tracking that was here before, this is what
// lets Ads Manager report cost-per-booking instead of just cost-per-click.
// sessionId is Stripe's unique checkout session id, deduped in
// sessionStorage so refreshing this same confirmation page doesn't
// double-count the same booking.
export default function TrackBookingConfirmed({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    const key = `fbq_schedule_${sessionId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    window.fbq?.("track", "Schedule");
  }, [sessionId]);

  return null;
}
