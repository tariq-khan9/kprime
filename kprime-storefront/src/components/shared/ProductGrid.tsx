import { ProductCard } from "@/components/shared/ProductCard"
import { Skeleton } from "@/components/ui/Skeleton"
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

/**
 * Mirrors ProductCard's structure element for element — square tile, two title
 * lines, a rating line, a price line.
 *
 * A rough grey box would defeat the purpose: the skeleton exists so that
 * swapping it for real content moves nothing on the page.
 */
function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-square w-full" />
      <div className="flex min-h-[2.5rem] flex-col gap-1">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-20" />
      {/* Matches PriceDisplay's reserved compare-at line. */}
      <Skeleton className="h-4 w-28 opacity-0" />
    </div>
  )
}

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
