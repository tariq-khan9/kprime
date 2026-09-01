import Image from "next/image"
import Link from "next/link"

import { PriceDisplay } from "@/components/shared/PriceDisplay"
import { StarRating } from "@/components/shared/StarRating"
import { Badge } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/Skeleton"
import type { ProductSummary } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

export type ProductCardProps = {
  product: ProductSummary
  /** Rating from the denormalised average — task 127. Absent until Block N. */
  rating?: number | null
  reviewCount?: number
  /** Set on the first row only: these are the LCP candidates. */
  priority?: boolean
  className?: string
}

/**
 * Five pages inherit this, and it is most of what a mobile visitor ever sees.
 *
 * The whole card is a single link. Nested interactive elements inside a link
 * break middle-click and "open in new tab", so add-to-cart never lives here —
 * it belongs on the product page.
 */
export function ProductCard({
  product,
  rating,
  reviewCount,
  priority = false,
  className,
}: ProductCardProps) {
  const discounted =
    product.price !== null &&
    product.originalPrice !== null &&
    product.originalPrice > product.price

  const percentOff = discounted
    ? Math.round(
        ((product.originalPrice! - product.price!) / product.originalPrice!) * 100
      )
    : 0

  return (
    <Link
      href={`/products/${product.handle}`}
      className={cn(
        "group flex flex-col gap-2 rounded-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        className
      )}
    >
      {/* Square, fixed. Supplier photography arrives at wildly mixed sizes and
          has to composite cleanly on cream; a fixed ratio is also what keeps
          the grid from reflowing as images load. */}
      {/* data-card-image is read by ProductRail, which centres its overlay
          arrows on the image rather than on the whole card. Measured rather
          than assumed, so changing this aspect ratio moves the arrows with
          it. */}
      <div
        data-card-image
        className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-line bg-paper"
      >
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            priority={priority}
            // Two per row at 360px, three at tablet, four at desktop.
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          // Not a fallback — every product is in this state until task 10 adds
          // photography, so it is the main path today and has to look
          // deliberate rather than broken.
          <div className="flex size-full items-center justify-center bg-cream">
            <span className="text-4xl font-bold text-line">
              {product.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {discounted && (
          <Badge variant="sale" className="absolute left-2 top-2 bg-sale text-paper">
            −{percentOff}%
          </Badge>
        )}
      </div>

      {/* Exactly two lines, always. min-h holds the second line open so a
          one-line title and a two-line title produce equal-height cards and
          the prices below them stay aligned across a row. */}
      <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-tight text-brand">
        {product.title}
      </h3>

      {/* Null today for every product — StarRating renders nothing rather than
          five empty stars. */}
      <StarRating value={rating} count={reviewCount} size="sm" />

      <PriceDisplay
        price={product.price}
        originalPrice={product.originalPrice}
        size="card"
      />
    </Link>
  )
}

/**
 * ProductCard's loading placeholder.
 *
 * Lives beside the card deliberately: it mirrors the structure above element
 * for element, and the two must change together. It previously existed twice —
 * once in ProductGrid and once in HomeSkeleton — and the copies drifted, the
 * second losing the title block, the rating line and the reserved compare-at
 * row. That made home-page skeletons ~52px shorter than the cards replacing
 * them, which is the layout shift a skeleton exists to prevent.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-[3/4] w-full" />
      {/* Matches the title's two reserved lines. */}
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
