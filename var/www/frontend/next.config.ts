import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "grandemaisonzoo.com" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "**.ytimg.com" },
    ],
  },
  // Allow server-side Node.js APIs (sqlite, fs, net) in API routes
  serverExternalPackages: ["better-sqlite3"],
  // In dev, proxy large media files and radio stream to the live server
  ...(isDev && {
    async rewrites() {
      return [
        {
          source: "/vid/:path*",
          destination: "https://grandemaisonzoo.com/vid/:path*",
        },
        // /uploads/ is handled by app/uploads/[...path]/route.ts in dev
        // (serves local files first, then redirects to prod as fallback)
        {
          source: "/covers/:path*",
          destination: "https://grandemaisonzoo.com/covers/:path*",
        },
        {
          source: "/stream",
          destination: "https://grandemaisonzoo.com/stream",
        },
      ];
    },
  }),
};

export default nextConfig;
