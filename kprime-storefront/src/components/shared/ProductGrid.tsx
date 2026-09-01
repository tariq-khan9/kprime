import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/shared/ProductCard"
import type { ProductSummary } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

export type ProductGridProps = {
  products: ProductSummary[]
  loading?: boolean
  /** How many placeholders to draw while loading. Match the real page size. */
  skeletonCount?: number
  className?: string
}

/**
 * Column counts match the `sizes` attribute on ProductCard's image, so the
 * browser requests the right resolution at each breakpoint rather than
 * downloading a desktop-sized file for a 360px screen.
 *
 *   360px  2 columns
 *   640px  3
 *   1024px 4
 */
const COLUMNS = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6"

export function ProductGrid({
  products,
  loading = false,
  skeletonCount = 8,
  className,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className={cn(COLUMNS, className)}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn(COLUMNS, className)}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          // Only the first row. Marking every image priority makes them all
          // compete for bandwidth and helps none of them.
          priority={index < 4}
        />
      ))}
    </div>
  )
}
