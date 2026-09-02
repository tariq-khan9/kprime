import { Suspense } from "react"

import { Container } from "@/components/layout/Container"
import { ActiveFilterChips } from "@/components/page/catalog/ActiveFilterChips"
import { EmptyResults } from "@/components/page/catalog/EmptyResults"
import { FilterDrawer } from "@/components/page/catalog/FilterDrawer"
import { FilterSidebar } from "@/components/page/catalog/FilterSidebar"
import { PaginationControls } from "@/components/page/catalog/PaginationControls"
import { SearchResultHeader } from "@/components/page/catalog/SearchResultHeader"
import { ProductGrid } from "@/components/shared/ProductGrid"
import { searchProducts } from "@/lib/data/products"
import { relaxationsFor } from "@/lib/filters/relaxations"
import { parseFilters } from "@/lib/filters/url-state"

/**
 * Search results.
 *
 * The category page with three differences: no breadcrumbs (§3 — there is no
 * trail), the header swapped, and `q` scoping the query instead of category
 * ids. Everything else — sidebar, drawer, chips, grid, pagination, empty state
 * — is the same components, so search results filter exactly like a category.
 *
 * No `loading.tsx` here either. This page never calls `notFound()`, so the
 * soft-404 risk that shaped the category page does not apply, but two sibling
 * listings with different streaming shapes is a trap for whoever edits them
 * next. `<Suspense>` around the grid, same as there.
 */
export const dynamic = "force-dynamic"

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const rawSearchParams = await searchParams
  const filters = parseFilters(rawSearchParams)

  // An empty query is not an error — it returns everything, which is what the
  // header labels "All products".
  const query = filters.q ?? undefined

  const { products, count, facets, priceBounds, page, pageCount } =
    await searchProducts({
      q: query,
      sort: filters.sort,
      page: filters.page,
      minPrice: filters.price?.min,
      maxPrice: filters.price?.max,
      facets: filters.groups,
    })

  // Only worth suggesting when filters are what emptied the set — with no
  // filters active there is nothing to relax, and the header already says the
  // query found nothing.
  const relaxations =
    count === 0 ? await relaxationsFor({ q: query }, filters) : []

  return (
    <Container className="py-6">
      <SearchResultHeader query={filters.q} count={count} />

      <div className="mt-6 flex gap-8">
        <FilterSidebar facets={facets} priceBounds={priceBounds} />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3">
            {/* `q`, not `handle` — the drawer's staged count has to be scoped
                to the same query the page ran. */}
            <FilterDrawer facets={facets} q={query} />
            <ActiveFilterChips facets={facets} />
          </div>

          {products.length > 0 ? (
            <>
              <Suspense
                fallback={<ProductGrid products={[]} loading skeletonCount={8} />}
              >
                <ProductGrid products={products} />
              </Suspense>

              <PaginationControls
                page={page}
                pageCount={pageCount}
                className="mt-8"
              />
            </>
          ) : (
            // With relaxations, this offers a way forward. With none — a query
            // that simply matched nothing — it still beats a blank column.
            <EmptyResults relaxations={relaxations} />
          )}
        </div>
      </div>
    </Container>
  )
}
