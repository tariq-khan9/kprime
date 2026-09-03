import type { ProductSummary } from "@/lib/data/products"

/**
 * Rating filtering, in the Next.js server layer.
 *
 * **Not a Medusa query, for the same reason price is not (§2.4).** The average
 * lives in `product.metadata`, which is JSONB and not queryable through the
 * store API — so this runs over the same cached result set price and facets
 * already filter, rather than costing a second fetch.
 */

/** The only thresholds offered. "1 star and up" would match everything. */
export const RATING_THRESHOLDS = [4, 3, 2] as const

export type RatingThreshold = (typeof RATING_THRESHOLDS)[number]

/**
 * Parses `?rating=4`.
 *
 * Anything that is not an offered threshold returns null — a hand-edited
 * `?rating=99` shows the unfiltered list rather than an empty one.
 */
export function parseRating(raw: string | null | undefined): number | null {
  if (!raw) {
    return null
  }

  const value = Number(raw)

  return RATING_THRESHOLDS.includes(value as RatingThreshold) ? value : null
}

/**
 * "4 stars and up", not "exactly 4".
 *
 * An unrated product never matches. It is not badly rated — it is unrated — but
 * someone asking for 4-and-up is asking for evidence, and no evidence is not
 * evidence of quality.
 */
export function matchesRating(
  product: ProductSummary,
  minimum: number | null
): boolean {
  if (minimum === null) {
    return true
  }

  return product.averageRating !== null && product.averageRating >= minimum
}

export function filterByRating(
  products: ProductSummary[],
  minimum: number | null
): ProductSummary[] {
  if (minimum === null) {
    return products
  }

  return products.filter((product) => matchesRating(product, minimum))
}

/**
 * How many products would survive each threshold.
 *
 * Computed over the set *before* rating filtering, so the counts beside each
 * option do not collapse to the current selection the moment one is chosen.
 */
export function ratingCounts(
  products: ProductSummary[]
): { minimum: RatingThreshold; count: number }[] {
  return RATING_THRESHOLDS.map((minimum) => ({
    minimum,
    count: products.filter((product) => matchesRating(product, minimum)).length,
  }))
}

/**
 * Highest rated first, unrated last.
 *
 * Unrated products sort to the bottom rather than being treated as zero: a
 * product nobody has reviewed is not worse than a one-star product, it is
 * simply unknown, and burying it below genuine one-star reviews would be a
 * harsher claim than the data supports.
 */
export function byRatingDesc(a: ProductSummary, b: ProductSummary): number {
  if (a.averageRating === null && b.averageRating === null) {
    return 0
  }

  if (a.averageRating === null) {
    return 1
  }

  if (b.averageRating === null) {
    return -1
  }

  // Ties broken by how many people said it: 5.0 from twenty reviews outranks
  // 5.0 from one.
  return b.averageRating - a.averageRating || b.reviewCount - a.reviewCount
}
