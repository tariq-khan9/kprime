import type { MetadataRoute } from "next"

import { BASE_URL } from "@/config/site"

/**
 * Robots rules.
 *
 * The catalogue is open. Everything personal or transactional is closed:
 *
 * - `/cart`, `/checkout` — per-visitor, and useless without a cookie
 * - `/order/` — a confirmed order, addressed by an unguessable id. Indexing one
 *   would put someone's receipt in a search result
 * - `/track` — order lookup; nothing to index and not somewhere to send traffic
 * - `/dev/` — diagnostics
 * - `/api/` — not pages
 *
 * `?sort=` and `?rating=` produce the same products in a different order, so
 * they are excluded to keep a crawler from treating each ordering as a separate
 * page. Facet and price parameters are left alone: those genuinely narrow the
 * set, and a category filtered to one brand is a page worth finding.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/cart",
        "/checkout",
        "/order/",
        "/track",
        "/dev/",
        "/api/",
        "/*?*sort=",
        "/*?*page=",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
