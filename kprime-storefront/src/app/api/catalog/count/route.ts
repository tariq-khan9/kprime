import { NextResponse } from "next/server"

import { getDescendantIds } from "@/lib/data/categories"
import { searchProducts } from "@/lib/data/products"
import { parseFilters } from "@/lib/filters/url-state"

/**
 * How many products a filter combination would return.
 *
 *   GET /api/catalog/count?handle=electronics&colour=black,white&price=0-5000
 *   GET /api/catalog/count?q=keyboard&colour=black
 *
 * Exists for the mobile filter drawer, which stages selections and shows the
 * result count before Apply. That count cannot be computed in the browser:
 * CLAUDE.md rule 4 forbids shipping the catalogue to the client to filter it,
 * and the per-value facet counts are not per-combination.
 *
 * Returns a number and nothing else — no product data crosses the wire. The
 * drawer debounces, so this is one small response per pause rather than a full
 * navigation per tick.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const handle = url.searchParams.get("handle")

  // Scoped by category, by query, or neither. `q` is what makes this usable
  // from /search, which has no handle to scope by.
  let categoryIds: string[] | undefined

  if (handle) {
    categoryIds = await getDescendantIds(handle)

    // An unknown handle has no descendants — answer 0 rather than falling
    // through to an unscoped query, which would return the whole catalogue.
    if (categoryIds.length === 0) {
      return NextResponse.json({ count: 0 })
    }
  }

  // `handle` is ours, not a facet. `q` is parsed by parseFilters like any
  // other reserved key, so the staged count and the applied result cannot
  // disagree.
  const params = new URLSearchParams(url.searchParams)
  params.delete("handle")

  const filters = parseFilters(params)

  const { count } = await searchProducts({
    ...(categoryIds ? { categoryIds } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    facets: filters.groups,
    minPrice: filters.price?.min,
    maxPrice: filters.price?.max,
    // Page size is irrelevant to a count, but 1 keeps the response small; the
    // count is of the whole matched set either way.
    pageSize: 1,
  })

  return NextResponse.json({ count })
}
