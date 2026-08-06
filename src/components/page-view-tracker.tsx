"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { logPageView } from "@/lib/analytics/page-views";

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    logPageView(pathname);
  }, [pathname]);

  return null;
}
