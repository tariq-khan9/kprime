import type { NextConfig } from "next";

/**
 * Medusa writes absolute image URLs into the database at upload time, pointing
 * at whatever MEDUSA_BACKEND_URL was set to. next/image refuses any remote host
 * that is not listed here, so without this every product photo 400s the moment
 * one exists.
 *
 * Derived from the same env var the SDK uses, so dev and production do not
 * drift apart. Task 150 does the wider image audit — formats, sizes, priority.
 */
const backendUrl = new URL(
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: backendUrl.protocol.replace(":", "") as "http" | "https",
        hostname: backendUrl.hostname,
        port: backendUrl.port || undefined,
        pathname: "/static/**",
      },
    ],
  },
};

export default nextConfig;
