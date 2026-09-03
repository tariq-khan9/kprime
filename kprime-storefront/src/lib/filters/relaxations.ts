import { searchProducts } from "@/lib/data/products"
import type { FilterState } from "@/lib/filters/url-state"

/** One filter that could be dropped, and what that would return. */
export type Relaxation = {
  /** A facet key, or `"price"` for the range. */
  group: string
  label: string
  count: number
}

/** What the listing is scoped to — a category, a search query, or neither. */
export type RelaxationScope = {
  categoryIds?: string[]
  q?: string
}

/**
 * For each active filter, how many products dropping it would return.
 *
 * "No products match" is a dead end. Naming which filter to drop, and the
 * number it returns, is the difference between a shopper leaving and clicking.
 *
 * Shared by the category and search pages so the two cannot drift. Call it only
 * when the result set is empty: each probe reuses the same cached native set,
 * so it costs an in-memory pass per active group rather than a fetch, but there
 * is no reason to pay even that when there are results to show.
 */
export async function relaxationsFor(
  scope: RelaxationScope,
  filters: FilterState
): Promise<Relaxation[]> {
  const candidates: { group: string; label: string; next: FilterState }[] = []

  for (const group of Object.keys(filters.groups)) {
    const groups = { ...filters.groups }
    delete groups[group]
    candidates.push({ group, label: group, next: { ...filters, groups } })
  }

  if (filters.price) {
    candidates.push({
      group: "price",
      label: "price filter",
      next: { ...filters, price: null },
    })
  }

  if (filters.rating !== null) {
    candidates.push({
      group: "rating",
      label: "rating filter",
      next: { ...filters, rating: null },
    })
  }

  const results = await Promise.all(
    candidates.map(async ({ group, label, next }) => {
      const { count } = await searchProducts({
        ...scope,
        facets: next.groups,
        minPrice: next.price?.min,
        maxPrice: next.price?.max,
        minRating: next.rating,
        pageSize: 1,
      })

      return { group, label, count }
    })
  )

  // Only offer a relaxation that actually helps — "remove colour → 0 results"
  // is worse than saying nothing.
  return results.filter((r) => r.count > 0).sort((a, b) => b.count - a.count)
}
