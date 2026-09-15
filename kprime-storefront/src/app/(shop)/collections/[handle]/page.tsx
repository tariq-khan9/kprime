import type { Metadata } from "next"
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

/**
 * Not a Medusa collection. `/collections/sale` is every product with a real
 * discount, whatever collection it belongs to — a product holds only one
 * collection, so a discounted Best Seller could never also sit in a Sale one.
 * A real collection created in admin with this handle is shadowed by this.
 */
const SALE_HANDLE = "sale"

const SALE = { handle: SALE_HANDLE, title: "Sale" }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const collection =
    handle === SALE_HANDLE ? SALE : await getCollectionByHandle(handle)

  if (!collection) {
    return { title: "Collection not found" }
  }

  const description =
    handle === SALE_HANDLE
      ? "Discounted prices, delivered across Pakistan, cash on delivery."
      : `${collection.title} — hand-picked and delivered across Pakistan, cash on delivery.`

  return {
    title: collection.title,
    description,
    alternates: { canonical: `/collections/${collection.handle}` },
    openGraph: {
      title: collection.title,
      description,
      url: `/collections/${collection.handle}`,
    },
  }
}

export default async function CollectionPage({
  params,
  searchParams,
}: PageProps<"/collections/[handle]">) {
  const [{ handle }, rawSearchParams] = await Promise.all([params, searchParams])

  const isSale = handle === SALE_HANDLE

  const found = isSale ? undefined : await getCollectionByHandle(handle)
  const collection = isSale ? SALE : found

  if (!collection) {
    notFound()
  }

  const filters = parseFilters(rawSearchParams)

  // No descendants to gather — a collection's products are exactly the ones
  // linked to it, so its own id is the whole scope.
  const { products, count, page, pageCount } = await searchProducts({
    ...(found ? { collectionIds: [found.id] } : { onSale: true }),
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
            {isSale
              ? "Nothing on sale right now."
              : "Nothing in this collection yet."}
          </p>
        )}
      </div>
    </Container>
  )
}
