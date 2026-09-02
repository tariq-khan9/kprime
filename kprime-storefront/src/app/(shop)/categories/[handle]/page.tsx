import { notFound } from "next/navigation"

import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Container } from "@/components/layout/Container"
import { ProductGrid } from "@/components/shared/ProductGrid"
import {
  getCategoryByHandle,
  getCategoryPath,
  getDescendantIds,
} from "@/lib/data/categories"
import { searchProducts } from "@/lib/data/products"
import { parseFilters } from "@/lib/filters/url-state"

/**
 * Category listing.
 *
 * Dynamic because it reads searchParams (§3) — filter state lives in the URL,
 * so this cannot be prerendered.
 *
 * The sidebar, sort control, chips and pagination UI arrive in tasks 64–74.
 * Their plumbing is already wired: parseFilters reads sort, page and price out
 * of the URL and passes them through, so `?sort=price_asc&page=2` works today
 * and those tasks only add controls.
 */
export const dynamic = "force-dynamic"

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/categories/[handle]">) {
  // Next 16: both are Promises.
  const [{ handle }, rawSearchParams] = await Promise.all([params, searchParams])

  const category = await getCategoryByHandle(handle)

  if (!category) {
    notFound()
  }

  const filters = parseFilters(rawSearchParams)

  // The category's own id AND every descendant's.
  //
  // Products are assigned to leaf categories only, so a parent like Electronics
  // has none of its own — passing just its id would render an empty page for
  // the busiest categories in the shop.
  const categoryIds = await getDescendantIds(handle)

  const [trail, { products, count }] = await Promise.all([
    getCategoryPath(handle),
    searchProducts({
      categoryIds,
      sort: filters.sort,
      page: filters.page,
      minPrice: filters.price?.min,
      maxPrice: filters.price?.max,
    }),
  ])

  return (
    <Container className="py-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...trail.map((node, i) => ({
            label: node.name,
            // The last crumb is the current page and must not be a link.
            href: i === trail.length - 1 ? undefined : `/categories/${node.handle}`,
          })),
        ]}
      />

      {/* Plain heading for now. CategoryHeader — description, subcategory chips,
          result count styling — is task 64. */}
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{category.name}</h1>

      {category.description && (
        <p className="mt-2 max-w-2xl text-muted">{category.description}</p>
      )}

      <p className="mt-1 text-muted">
        {count} {count === 1 ? "product" : "products"}
      </p>

      <div className="mt-6">
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          // Inline, not the EmptyState primitive — that is task 73, which also
          // adds filter-relaxation suggestions. Half the categories are empty
          // until task 10 imports a real catalogue, so a bare grid here would
          // read as a broken page rather than an empty one.
          <p className="rounded-lg border border-line bg-cream p-6 text-muted">
            Nothing in this category yet.
          </p>
        )}
      </div>
    </Container>
  )
}
