import type { MetadataRoute } from "next";

// Hardcoded rather than trusting NEXT_PUBLIC_SITE_URL alone — that env var
// has drifted to a local dev tunnel URL before, and a sitemap pointing at a
// dead tunnel is worse than no sitemap at all.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://www.")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://www.paintedpawsaustin.com";

// Only real, public marketing content — account/admin/auth pages are
// private (many require login) and have no business being indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/services", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/portfolio", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/faq", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/membership", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
