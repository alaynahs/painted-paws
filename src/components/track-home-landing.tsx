"use client";

import { useEffect } from "react";
import { logBookingStep } from "@/lib/analytics/booking-funnel";

export default function TrackHomeLanding() {
  useEffect(() => {
    logBookingStep("landed_home");
  }, []);

  return null;
}
