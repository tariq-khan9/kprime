import { StarRating } from "@/components/shared/StarRating"
import type { ProductDetail } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

/** Where the rating link scrolls to. The reviews block claims this in Block N. */
export const REVIEWS_ANCHOR = "reviews"

/**
 * Tags that describe the product rather than name its maker.
 *
 * Brand is stored as a tag because Medusa has no brand field, which means the
 * tag list is a mixture of brands and merchandising labels. Anything listed
 * here is merchandising and must not be shown as a brand.
 */
const NON_BRAND_TAGS = new Set([
  "New Arrival",
  "Bestseller",
  "Imported",
  "Warranty Included",
  "Sale",
])

function brandOf(tags: string[]): string | null {
  return tags.find((tag) => !NON_BRAND_TAGS.has(tag)) ?? null
}

export type ProductTitleBlockProps = {
  product: ProductDetail
  /** SKU of the selected variant. Falls back to the first when none is chosen. */
  sku?: string | null
  rating?: number | null
  reviewCount?: number
  className?: string
}

/**
 * Title, brand, SKU and rating.
 *
 * The rating is an anchor down to the reviews block rather than a decoration —
 * someone who looks at stars usually wants to read why.
 *
 * With no reviews it says "No reviews yet" and renders no stars at all. Showing
 * an empty five-star row would read as a zero-star rating, which is a much
 * worse claim than silence. Ratings arrive in Block N.
 */
export function ProductTitleBlock({
  product,
  sku,
  rating = null,
  reviewCount = 0,
  className,
}: ProductTitleBlockProps) {
  const brand = brandOf(product.tags)
  const shownSku = sku ?? product.variants[0]?.sku ?? null
  const hasReviews = rating !== null && reviewCount > 0

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {brand && (
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          {brand}
        </p>
      )}

      <h1 className="text-2xl font-bold sm:text-3xl">{product.title}</h1>

      <a
        href={`#${REVIEWS_ANCHOR}`}
        className={cn(
          "flex min-h-11 w-fit items-center gap-2 text-sm text-muted",
          "hover:text-brand focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-brand"
        )}
      >
        {hasReviews ? (
          <>
            <StarRating value={rating} count={reviewCount} size="sm" />
            <span className="underline">Read reviews</span>
          </>
        ) : (
          <span className="underline">No reviews yet</span>
        )}
      </a>

      {shownSku && (
        <p className="text-sm text-muted">
          SKU <span className="text-brand">{shownSku}</span>
        </p>
      )}
    </div>
  )
}
