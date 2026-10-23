import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app is per-user and authenticated, so there is nothing to
  // prerender or cache at the component level. Keeping Cache Components off keeps
  // the request model simple and explicit.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
