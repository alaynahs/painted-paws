"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

// Google Ads conversion action for a completed booking, from the "Book
// appointment" conversion's event snippet in Tools & Settings > Conversions.
const GOOGLE_ADS_CONVERSION_LABEL = "AW-18397379594/xZOICPj89eMcEIr4xsRE";

// Fires the Meta Pixel's "Schedule" event and the Google Ads conversion
// event the moment a customer lands back on /account after actually paying
// for a new booking — as opposed to page-view-only tracking, this is what
// lets both ad platforms report cost-per-booking instead of just
// cost-per-click. sessionId is Stripe's unique checkout session id, deduped
// in sessionStorage so refreshing this same confirmation page doesn't
// double-count the same booking. value is the real appointment price, so
// Google's bidding can optimize toward higher-value bookings instead of a
// flat placeholder.
export default function TrackBookingConfirmed({
  sessionId,
  value,
}: {
  sessionId: string;
  value?: number;
}) {
  useEffect(() => {
    const key = `booking_conversion_${sessionId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    window.fbq?.("track", "Schedule");
    window.gtag?.("event", "conversion", {
      send_to: GOOGLE_ADS_CONVERSION_LABEL,
      value: value ?? 1.0,
      currency: "USD",
    });
  }, [sessionId, value]);

  return null;
}
