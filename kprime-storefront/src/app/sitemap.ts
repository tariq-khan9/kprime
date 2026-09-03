import type { MetadataRoute } from "next"

import { BASE_URL } from "@/config/site"
import { getCategoryTree, type CategoryNode } from "@/lib/data/categories"
import { getCollections } from "@/lib/data/collections"
import { getProductHandles } from "@/lib/data/products"

/**
 * The sitemap.
 *
 * **Only pages a stranger can usefully open.** Cart, checkout, order
 * confirmation and tracking are all excluded: they are either personal to one
 * visitor or meaningless without a cookie, and listing them invites crawlers to
 * spend the crawl budget on pages that will always be empty or redirect.
 * `/dev/*` is excluded for the same reason plus the obvious one.
 *
 * Built from live data, so a category added in admin appears without a code
 * change.
 */

/** Public, indexable static routes. Kept next to the disallow list in robots. */
const STATIC_PATHS = [
  "",
  "/about",
  "/contact",
  "/faq",
  "/shipping-and-delivery",
  "/returns-and-refunds",
  "/privacy",
  "/terms",
]

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)])
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Each source is allowed to fail on its own. A backend hiccup should degrade
  // the sitemap, not return a 500 that makes crawlers drop it entirely.
  const [handles, tree, collections] = await Promise.all([
    getProductHandles().catch(() => []),
    getCategoryTree().catch(() => []),
    getCollections().catch(() => []),
  ])

  return [
    ...STATIC_PATHS.map((path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: now,
      // The home page is the entry point; the policy pages change rarely.
      changeFrequency: (path === "" ? "daily" : "monthly") as
        | "daily"
        | "monthly",
      priority: path === "" ? 1 : 0.3,
    })),

    ...flatten(tree).map((category) => ({
      url: `${BASE_URL}/categories/${category.handle}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),

    ...collections.map((collection) => ({
      url: `${BASE_URL}/collections/${collection.handle}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),

    ...handles.map((handle) => ({
      url: `${BASE_URL}/products/${handle}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      // Products are what people search for; they outrank the policy pages.
      priority: 0.9,
    })),
  ]
}
