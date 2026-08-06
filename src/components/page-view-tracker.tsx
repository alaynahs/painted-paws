"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { logPageView } from "@/lib/analytics/page-views";
import { getOrCreateVisitorId } from "@/lib/analytics/visitor-id";

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    logPageView(pathname, getOrCreateVisitorId());
  }, [pathname]);

  return null;
}
