import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Container } from "@/components/layout/Container"
import { CategoryHeader } from "@/components/page/catalog/CategoryHeader"
import { PaginationControls } from "@/components/page/catalog/PaginationControls"
import { SortDropdown } from "@/components/page/catalog/SortDropdown"
import { ProductGrid } from "@/components/shared/ProductGrid"
import { getCollectionByHandle } from "@/lib/data/collections"
import { searchProducts } from "@/lib/data/products"
import { parseFilters } from "@/lib/filters/url-state"

/**
 * Collection listing — the category page with the filtering stripped out.
 *
 * **Deliberately no faceted filters** (§4.10). A collection is a merchandised
 * set: a human already chose what belongs in it, so there is nothing for a
 * shopper to narrow down. No sidebar, no drawer, no chips, no price range.
 *
 * Dynamic, not static. The task sheet asks for `generateStaticParams` and
 * static rendering, but it also asks for sort and pagination — and in Next 16
 * awaiting `searchParams` opts the route into request-time rendering, so the
 * two cannot both hold. Sort and pagination won; this matches the two sibling
 * listings, which matters because all three share `page/catalog/` components.
 *
 * NOTE: no `loading.tsx` in this segment, same rule as the category page. A
 * loading file creates a Suspense boundary above the page, so Next streams and
 * sends 200 before the component runs, and `notFound()` below could never set a
 * 404. Streaming is the <Suspense> around the grid, which sits AFTER the check.
 */
export const dynamic = "force-dynamic"

export default async function CollectionPage({
  params,
  searchParams,
}: PageProps<"/collections/[handle]">) {
  const [{ handle }, rawSearchParams] = await Promise.all([params, searchParams])

  const collection = await getCollectionByHandle(handle)

  if (!collection) {
    notFound()
  }

  const filters = parseFilters(rawSearchParams)

  // No descendants to gather — a collection's products are exactly the ones
  // linked to it, so its own id is the whole scope.
  const { products, count, page, pageCount } = await searchProducts({
    collectionIds: [collection.id],
    sort: filters.sort,
    page: filters.page,
  })

  return (
    <Container className="py-6">
      {/* Home → title, with no "Collections" crumb between them: there is no
          /collections index route, so that link would 404. */}
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: collection.title }]}
      />

      <CategoryHeader
        category={{ name: collection.title }}
        count={count}
        className="mt-4"
      />

      {/* Rendered standalone. On a category page SortDropdown lives inside
          FilterSidebar, which this page does not render — without this the sort
          control would silently disappear. */}
      <div className="mt-6 flex justify-end">
        <SortDropdown className="w-full sm:w-56" />
      </div>

      <div className="mt-4">
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
          // No relaxation suggestions here — there are no filters to relax, so
          // an empty collection is an empty collection.
          <p className="py-12 text-center text-muted">
            Nothing in this collection yet.
          </p>
        )}
      </div>
    </Container>
  )
}
