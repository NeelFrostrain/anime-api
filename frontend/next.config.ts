import type { NextConfig } from "next";

const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
const envBackendUrl = process.env.BACKEND_URL;

const BACKEND_URL =
  isVercel && (!envBackendUrl || envBackendUrl.includes("127.0.0.1") || envBackendUrl.includes("localhost"))
    ? "https://anime-api.neelofficial0812.workers.dev"
    : envBackendUrl ||
      (process.env.NODE_ENV === "production" || isVercel
        ? "https://anime-api.neelofficial0812.workers.dev"
        : "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.7",
    "192.168.1.7:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/proxy_m3u8",
        destination: `${BACKEND_URL}/proxy_m3u8`,
      },
      {
        source: "/proxy_segment",
        destination: `${BACKEND_URL}/proxy_segment`,
      },
      {
        source: "/proxy_subtitle",
        destination: `${BACKEND_URL}/proxy_subtitle`,
      },
    ];
  },
};

export default nextConfig;
