"use client"

import { useState } from "react"

import { ReviewCard } from "@/components/page/review/ReviewCard"
import { Button } from "@/components/ui/Button"
import { loadReviewPageAction } from "@/lib/data/reviews.actions"
import { REVIEWS_PAGE_SIZE, type Review } from "@/lib/data/reviews"
import { cn } from "@/lib/utils/format"

export type ReviewListProps = {
  productId: string
  /** Server-rendered first page. Present in the HTML source, not fetched. */
  initial: Review[]
  total: number
  /** Only reviews with this rating, when a distribution bar is selected. */
  filterRating?: number | null
  className?: string
}

/**
 * The review list.
 *
 * **The first page is server-rendered** and arrives in the HTML — reviews are
 * the page's most persuasive content and the part search engines should see, so
 * it must not depend on JavaScript running. "Load more" then appends further
 * pages client-side, without re-rendering what is already there (§2.4).
 *
 * Flat. No indentation, no threading — a merchant reply nests once inside its
 * own card and that is the deepest this ever goes.
 *
 * Rating filtering happens here in memory over what has been loaded, rather
 * than as a server round trip: the distribution bars are a way to skim a list
 * someone is already reading, not a new query.
 */
export function ReviewList({
  productId,
  initial,
  total,
  filterRating = null,
  className,
}: ReviewListProps) {
  const [reviews, setReviews] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shown = filterRating
    ? reviews.filter((review) => review.rating === filterRating)
    : reviews

  const hasMore = reviews.length < total

  const loadMore = async () => {
    setLoading(true)
    setError(null)

    try {
      const page = await loadReviewPageAction(productId, reviews.length)

      // Appended, never replaced: re-rendering the list would scroll the reader
      // back to the top of something they were halfway through.
      setReviews((current) => [...current, ...page.reviews])
    } catch {
      setError("Could not load more reviews. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (reviews.length === 0) {
    return (
      <p className={cn("py-6 text-muted", className)}>
        No reviews yet. If you have bought this, yours would be the first.
      </p>
    )
  }

  return (
    <div className={className}>
      {filterRating && shown.length === 0 ? (
        <p className="py-6 text-muted">
          No {filterRating}-star reviews have loaded yet.
          {hasMore && " Load more to keep looking."}
        </p>
      ) : (
        shown.map((review) => <ReviewCard key={review.id} review={review} />)
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-sale">
          {error}
        </p>
      )}

      {hasMore && (
        <div className="mt-4 flex flex-col items-start gap-2">
          <Button
            variant="secondary"
            onClick={loadMore}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Loading…" : `Load more reviews`}
          </Button>

          <p className="text-sm text-muted">
            Showing {reviews.length} of {total}
          </p>
        </div>
      )}
    </div>
  )
}

export { REVIEWS_PAGE_SIZE }
