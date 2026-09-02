import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Container } from "@/components/layout/Container"
import { ActiveFilterChips } from "@/components/page/catalog/ActiveFilterChips"
import { CategoryHeader } from "@/components/page/catalog/CategoryHeader"
import {
  EmptyResults,
  type Relaxation,
} from "@/components/page/catalog/EmptyResults"
import { FilterDrawer } from "@/components/page/catalog/FilterDrawer"
import { FilterSidebar } from "@/components/page/catalog/FilterSidebar"
import { PaginationControls } from "@/components/page/catalog/PaginationControls"
import { ProductGrid } from "@/components/shared/ProductGrid"
import {
  getCategoryByHandle,
  getCategoryPath,
  getDescendantIds,
} from "@/lib/data/categories"
import { searchProducts } from "@/lib/data/products"
import { parseFilters, type FilterState } from "@/lib/filters/url-state"

/**
 * Category listing.
 *
 * Dynamic because it reads searchParams (§3) — filter state lives in the URL,
 * so this cannot be prerendered.
 *
 * NOTE: there is deliberately NO `loading.tsx` in this segment. A loading file
 * creates a Suspense boundary above the page, so Next streams and sends 200
 * before the component runs — `notFound()` below could then never set a 404 and
 * every unknown handle would be a soft 404. That bug already happened once,
 * from `(shop)/loading.tsx`. Task 74's streaming is the <Suspense> around the
 * grid instead, which sits AFTER the 404 check.
 */
export const dynamic = "force-dynamic"

/**
 * For each active filter, how many products dropping it would return.
 *
 * Runs only when the set is empty, and every call reuses the same cached native
 * set, so this costs an in-memory pass per active group rather than a fetch.
 * Naming the filter to drop is what turns a dead end into a next step.
 */
async function relaxationsFor(
  categoryIds: string[],
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

  const results = await Promise.all(
    candidates.map(async ({ group, label, next }) => {
      const { count } = await searchProducts({
        categoryIds,
        facets: next.groups,
        minPrice: next.price?.min,
        maxPrice: next.price?.max,
        pageSize: 1,
      })

      return { group, label, count }
    })
  )

  // Only suggest a relaxation that actually helps.
  return results.filter((r) => r.count > 0).sort((a, b) => b.count - a.count)
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/categories/[handle]">) {
  const [{ handle }, rawSearchParams] = await Promise.all([params, searchParams])

  const category = await getCategoryByHandle(handle)

  if (!category) {
    notFound()
  }

  const filters = parseFilters(rawSearchParams)

  // The category's own id AND every descendant's. Products sit on leaves only,
  // so passing just this id would render an empty page for a parent.
  const categoryIds = await getDescendantIds(handle)

  const [trail, { products, count, facets, priceBounds, page, pageCount }] =
    await Promise.all([
      getCategoryPath(handle),
      searchProducts({
        categoryIds,
        sort: filters.sort,
        page: filters.page,
        minPrice: filters.price?.min,
        maxPrice: filters.price?.max,
        facets: filters.groups,
      }),
    ])

  const relaxations = count === 0 ? await relaxationsFor(categoryIds, filters) : []

  return (
    <Container className="py-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...trail.map((node, i) => ({
            label: node.name,
            href:
              i === trail.length - 1 ? undefined : `/categories/${node.handle}`,
          })),
        ]}
      />

      <CategoryHeader category={category} count={count} className="mt-4" />

      <div className="mt-6 flex gap-8">
        <FilterSidebar facets={facets} priceBounds={priceBounds} />

        <div className="min-w-0 flex-1">
          {/* The drawer trigger is mobile-only; the chips show at every width,
              since below lg there is no sidebar to read active state from. */}
          <div className="mb-4 flex flex-col gap-3">
            <FilterDrawer facets={facets} handle={handle} />
            <ActiveFilterChips facets={facets} />
          </div>

          {products.length > 0 ? (
            <>
              {/* Task 74: streaming lives HERE, after notFound(). */}
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
            <EmptyResults relaxations={relaxations} />
          )}
        </div>
      </div>
    </Container>
  )
}
