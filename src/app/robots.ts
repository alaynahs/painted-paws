import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://www.")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://www.paintedpawsaustin.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/auth", "/leave-a-review"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
