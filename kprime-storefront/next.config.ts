import type { NextConfig } from "next";

/**
 * Medusa writes absolute image URLs into the database at upload time, pointing
 * at whatever MEDUSA_BACKEND_URL was set to. next/image refuses any remote host
 * that is not listed here, so without this every product photo 400s the moment
 * one exists.
 *
 * Derived from the same env var the SDK uses, so dev and production do not
 * drift apart.
 */
const backendUrl = new URL(
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
);

const nextConfig: NextConfig = {
  images: {
    /**
     * AVIF first, WebP second, original last.
     *
     * Next negotiates per request from the Accept header, so a browser that
     * cannot take AVIF still gets WebP. Ordering matters: AVIF is roughly 20–30%
     * smaller than WebP at the same quality, which is worth having on a shop
     * whose traffic is mostly mobile data.
     */
    formats: ["image/avif", "image/webp"],
    /**
     * Next 16 refuses to optimize an image whose host resolves to a private IP,
     * as SSRF protection. In development the Medusa backend is localhost, which
     * resolves to 127.0.0.1, so every product image 400s with
     * "url parameter is not allowed" — remotePatterns matching correctly makes
     * no difference.
     *
     * Enabled for development only. In production the backend is a real public
     * domain and this guard is worth having, so it must stay off there.
     */
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
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
