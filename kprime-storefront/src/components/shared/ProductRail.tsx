import { ProductCard } from "@/components/shared/ProductCard"
import { ScrollRail } from "@/components/shared/ScrollRail"
import type { ProductSummary } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

export type ProductRailProps = {
  title: string
  products: ProductSummary[]
  viewAllHref?: string
  /** Set on the first rail on a page — its images are LCP candidates. */
  priority?: boolean
  className?: string
}

/**
 * Horizontally scrolling row of products. Used on the home page and again for
 * related items on the product page.
 *
 * A server component: all the scroll and arrow behaviour lives in ScrollRail,
 * so the cards themselves are rendered on the server and only the wrapper
 * ships to the browser.
 */
export function ProductRail({
  title,
  products,
  viewAllHref,
  priority = false,
  className,
}: ProductRailProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <ScrollRail
      title={title}
      viewAllHref={viewAllHref}
      // Centre the arrows on the image, not the card. A product card is an
      // image plus two or three lines of text, so the card's midpoint sits
      // noticeably below the image's.
      centreOn="[data-card-image]"
      className={className}
    >
      {products.map((product, index) => (
        <div
          key={product.id}
          className={cn(
            "shrink-0 snap-start",
            // Fractional widths on purpose: part of the next card stays
            // visible, which is what tells a thumb there is more to the right.
            //
            // 23% at lg gives four cards plus a sliver of the fifth, matching
            // ProductGrid's four columns — the same product is the same size
            // whether it appears in a rail or a grid.
            "w-[40%] sm:w-[28%] lg:w-[23%]"
          )}
        >
          <ProductCard
            product={product}
            rating={product.averageRating}
            reviewCount={product.reviewCount}
            priority={priority && index < 2}
          />
        </div>
      ))}
    </ScrollRail>
  )
}
