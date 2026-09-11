import type { NextConfig } from "next";

/**
 * Medusa writes absolute image URLs into the database at upload time, pointing
 * at whatever MEDUSA_BACKEND_URL was set to. next/image refuses any remote host
 * that is not listed here, so without this every product photo 400s the moment
 * one exists.
 *
 * Derived from the same env var the SDK uses, so dev and production do not
 * drift apart.
 *
 * Throws rather than defaulting, exactly as lib/sdk.ts does for this same
 * variable. This file is not bundled — it is evaluated by `next start` at boot,
 * so a container missing the variable at runtime used to fall back to localhost
 * and reject every real image host with `"url" parameter is not allowed`. A
 * shop with no pictures is worse than a server that refuses to start.
 */
const rawBackendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;

if (!rawBackendUrl) {
  throw new Error(
    "NEXT_PUBLIC_MEDUSA_BACKEND_URL is not set. next/image reads it at runtime " +
      "to allow the backend image host — without it every product image 400s."
  );
}

const backendUrl = new URL(rawBackendUrl);

const nextConfig: NextConfig = {
  /**
   * Stop advertising the framework. `X-Powered-By: Next.js` tells an attacker
   * which CVE list to read first and buys nothing in return.
   */
  poweredByHeader: false,

  /**
   * Security headers. There were none at all before this.
   *
   * **No Content-Security-Policy here on purpose.** Next inlines its own
   * bootstrap script and the product-video facade loads a YouTube iframe, so a
   * CSP needs real allowances worked out and tested — and a wrong one breaks
   * the page silently, with no error anywhere. It deserves its own pass rather
   * than a guessed line here.
   *
   * HSTS does nothing on localhost; it starts mattering the day this is served
   * over HTTPS on a real domain, which is why it is set now rather than being
   * remembered later.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The storefront is never meant to be framed. Clickjacking a COD
          // checkout is a real attack, not a theoretical one.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ]
  },

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
      /**
       * YouTube poster frames for the optional product video. Only ever
       * `/vi/<id>/*` — the embed itself is an iframe and does not come through
       * next/image at all.
       */
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
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
