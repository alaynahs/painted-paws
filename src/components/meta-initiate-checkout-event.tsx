"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Meta Pixel's InitiateCheckout event, per Meta's own setup instructions:
// fired once when a customer actually reaches the booking form — not
// site-wide like the base PageView pixel in the root layout.
export default function MetaInitiateCheckoutEvent() {
  useEffect(() => {
    window.fbq?.("track", "InitiateCheckout");
  }, []);

  return null;
}
