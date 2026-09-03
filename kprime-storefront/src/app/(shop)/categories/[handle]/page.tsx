import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Container } from "@/components/layout/Container"
import { ActiveFilterChips } from "@/components/page/catalog/ActiveFilterChips"
import { CategoryHeader } from "@/components/page/catalog/CategoryHeader"
import { EmptyResults } from "@/components/page/catalog/EmptyResults"
import { FilterDrawer } from "@/components/page/catalog/FilterDrawer"
import { FilterSidebar } from "@/components/page/catalog/FilterSidebar"
import { PaginationControls } from "@/components/page/catalog/PaginationControls"
import { JsonLd } from "@/components/shared/JsonLd"
import { ProductGrid } from "@/components/shared/ProductGrid"
import {
  getCategoryByHandle,
  getCategoryPath,
  getDescendantIds,
} from "@/lib/data/categories"
import { searchProducts } from "@/lib/data/products"
import { relaxationsFor } from "@/lib/filters/relaxations"
import { parseFilters } from "@/lib/filters/url-state"
import { breadcrumbList } from "@/lib/seo/structured-data"

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
 * Category metadata (task 145).
 *
 * The description comes from the category's own `description` in admin when it
 * has one, so merchandising copy written by the shop is what search engines
 * show — no code change needed to improve it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)

  if (!category) {
    return { title: "Category not found" }
  }

  const description =
    category.description ??
    `${category.name} delivered across Pakistan, cash on delivery.`

  return {
    title: category.name,
    description,
    alternates: { canonical: `/categories/${category.handle}` },
    openGraph: {
      title: category.name,
      description,
      url: `/categories/${category.handle}`,
    },
  }
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

  const [trail, { products, count, facets, priceBounds, ratingCounts, page, pageCount }] =
    await Promise.all([
      getCategoryPath(handle),
      searchProducts({
        categoryIds,
        sort: filters.sort,
        page: filters.page,
        minPrice: filters.price?.min,
        maxPrice: filters.price?.max,
        minRating: filters.rating,
        facets: filters.groups,
      }),
    ])

  const relaxations = count === 0 ? await relaxationsFor({ categoryIds }, filters) : []

  return (
    <Container className="py-6">
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          ...trail.map((node) => ({
            name: node.name,
            path: `/categories/${node.handle}`,
          })),
        ])}
      />

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
        <FilterSidebar
            facets={facets}
            priceBounds={priceBounds}
            ratingCounts={ratingCounts}
          />

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
