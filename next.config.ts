import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next.js's default server action body limit is 1MB, which silently
    // rejects almost any real phone photo (site photos, booking inspo
    // photos, rabies vaccine PDF scans all upload via server actions).
    // Raised to comfortably fit real-world file sizes.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
