import { notFound } from "next/navigation"

import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Container } from "@/components/layout/Container"
import { MobileGallerySwiper } from "@/components/page/product/MobileGallerySwiper"
import { ProductBuyPanel } from "@/components/page/product/ProductBuyPanel"
import { ProductGallery } from "@/components/page/product/ProductGallery"
import { ProductTabs } from "@/components/page/product/ProductTabs"
import { ProductReviews } from "@/components/page/review/ProductReviews"
import { ProductRail } from "@/components/shared/ProductRail"
import { REVIEWS_ANCHOR } from "@/components/page/product/ProductTitleBlock"
import { getCategoryPath } from "@/lib/data/categories"
import { getFirstReviewPage } from "@/lib/data/reviews"
import { getProduct, getProductHandles, searchProducts } from "@/lib/data/products"

/**
 * Product detail.
 *
 * Static with revalidation (§3), unlike the listings: this page reads no
 * searchParams, so nothing forces it to render per request. Every product
 * handle is prerendered at build.
 *
 * NOTE: no `loading.tsx` in this segment. A loading file creates a Suspense
 * boundary above the page, so Next streams and sends 200 before the component
 * runs, and the `notFound()` below could never set a 404. The `(home)` group
 * has one, but it is a sibling and does not sit above this route.
 */
export const revalidate = 3600

/** How many related products the rail asks for. */
const RELATED_LIMIT = 12

/**
 * Prerender every product.
 *
 * `dynamicParams` stays at its default of true, so a product added in admin
 * after a build still renders — on demand, then cached — rather than 404ing
 * until the next deploy.
 */
export async function generateStaticParams() {
  const handles = await getProductHandles()

  return handles.map((handle) => ({ handle }))
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[handle]">) {
  const { handle } = await params

  const product = await getProduct(handle)

  if (!product) {
    notFound()
  }

  // Deepest category the product sits in, so the trail matches how it was
  // found. Products are assigned to leaves, so the last one is the specific one.
  const leaf = product.categories[product.categories.length - 1] ?? null

  const [trail, related, reviews] = await Promise.all([
    leaf ? getCategoryPath(leaf.handle) : Promise.resolve([]),
    leaf
      ? searchProducts({ categoryIds: [leaf.id], pageSize: RELATED_LIMIT })
      : Promise.resolve({ products: [] }),
    // First page only, cached under the reviews tag so approving one in admin
    // shows up without a rebuild (§2.4).
    getFirstReviewPage(product.id),
  ])

  // Never recommend the page you are already on.
  const siblings = related.products.filter((item) => item.id !== product.id)

  return (
    <Container className="py-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...trail.map((node) => ({
            label: node.name,
            href: `/categories/${node.handle}`,
          })),
          { label: product.title },
        ]}
      />

      <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:gap-10">
        {/* 2/5, not 1/2 — a half-width column at aspect-[3/4] renders roughly
            800px tall on a 1280px screen, which pushes the buy area under the
            fold. 20% narrower keeps the whole product visible beside it. Mobile
            stays full-bleed: at 360px there is no width to give away. */}
        <div className="lg:w-2/5 lg:shrink-0">
          {/* One gallery per breakpoint rather than one responsive component:
              hover zoom is meaningless on a touch screen, and snap-scrolling is
              the wrong interaction for a mouse. */}
          <MobileGallerySwiper
            images={product.images}
            title={product.title}
            priority
            className="lg:hidden"
          />

          <ProductGallery
            images={product.images}
            title={product.title}
            priority
            className="hidden lg:flex"
          />
        </div>

        <div className="min-w-0 flex-1">
          <ProductBuyPanel
            product={product}
            rating={reviews.average}
            reviewCount={reviews.count}
          />
        </div>
      </div>

      <ProductTabs product={product} className="mt-10" />

      {/* The anchor the star rating in ProductTitleBlock links down to. */}
      <section id={REVIEWS_ANCHOR} className="mt-12 scroll-mt-24">
        <h2 className="text-xl font-bold sm:text-2xl">Reviews</h2>

        <div className="mt-4">
          <ProductReviews productId={product.id} page={reviews} />
        </div>
      </section>

      {siblings.length > 0 && (
        <ProductRail
          title="You might also like"
          products={siblings}
          viewAllHref={leaf ? `/categories/${leaf.handle}` : undefined}
          className="mt-12"
        />
      )}
    </Container>
  )
}
