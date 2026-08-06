"use client";

import { useEffect } from "react";
import { logBookingStep } from "@/lib/analytics/booking-funnel";
import { getOrCreateVisitorId } from "@/lib/analytics/visitor-id";

export default function TrackHomeLanding() {
  useEffect(() => {
    logBookingStep("landed_home", getOrCreateVisitorId());
  }, []);

  return null;
}
