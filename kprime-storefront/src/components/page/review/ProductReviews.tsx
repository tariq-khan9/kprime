"use client"

import { useState } from "react"

import { ReviewForm } from "@/components/page/review/ReviewForm"
import { ReviewList } from "@/components/page/review/ReviewList"
import { ReviewSummary } from "@/components/page/review/ReviewSummary"
import { Button } from "@/components/ui/Button"
import type { ReviewPage } from "@/lib/data/reviews"

export type ProductReviewsProps = {
  productId: string
  page: ReviewPage
}

/**
 * The reviews block on a product page.
 *
 * A thin client shell around three components that need to share two pieces of
 * state — which distribution bar is selected, and whether the form is open.
 * The page itself stays a server component, and the first page of reviews is
 * still server-rendered: `ReviewList` receives it as a prop rather than
 * fetching it.
 *
 * The form is behind a button rather than always open. Most people reading
 * reviews are deciding whether to buy, not writing one, and an open form with
 * an order-number field reads as a barrier on a page whose job is to persuade.
 */
export function ProductReviews({ productId, page }: ProductReviewsProps) {
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [writing, setWriting] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <ReviewSummary
        average={page.average}
        count={page.count}
        distribution={page.distribution}
        selected={filterRating}
        onSelect={setFilterRating}
      />

      {writing ? (
        <ReviewForm productId={productId} />
      ) : (
        <Button
          variant="secondary"
          onClick={() => setWriting(true)}
          className="w-full sm:w-auto"
        >
          Write a review
        </Button>
      )}

      <ReviewList
        productId={productId}
        initial={page.reviews}
        total={page.count}
        filterRating={filterRating}
      />
    </div>
  )
}
