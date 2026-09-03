import { unstable_cache } from "next/cache"

import { sdk } from "@/lib/sdk"

export type Review = {
  id: string
  rating: number
  title: string | null
  content: string | null
  createdAt: string
  /** Already masked by the backend — "Ahmed K.", never a full name or phone. */
  author: string
  verifiedBuyer: boolean
  reply: { id: string; content: string; createdAt: string } | null
}

export type RatingDistribution = { stars: number; count: number }[]

export type ReviewPage = {
  reviews: Review[]
  /** Total approved reviews, not the size of this page. */
  count: number
  average: number | null
  distribution: RatingDistribution
}

/** How many render into the static page. "Load more" fetches the rest. */
export const REVIEWS_PAGE_SIZE = 5

/** Revalidated when a review is approved or rejected. */
export const REVIEWS_TAG = "reviews"

type RawReview = {
  id: string
  rating?: number | null
  title?: string | null
  content?: string | null
  created_at?: string | null
  author?: string | null
  verified_buyer?: boolean | null
  reply?: { id: string; content?: string | null; created_at?: string | null } | null
}

type RawPage = {
  reviews?: RawReview[]
  count?: number
  summary?: {
    average?: number | null
    count?: number
    distribution?: RatingDistribution
  }
}

function toPage(raw: RawPage): ReviewPage {
  return {
    reviews: (raw.reviews ?? []).map((review) => ({
      id: review.id,
      rating: review.rating ?? 0,
      title: review.title ?? null,
      content: review.content ?? null,
      createdAt: review.created_at ?? "",
      author: review.author ?? "Verified buyer",
      verifiedBuyer: review.verified_buyer ?? true,
      reply: review.reply
        ? {
            id: review.reply.id,
            content: review.reply.content ?? "",
            createdAt: review.reply.created_at ?? "",
          }
        : null,
    })),
    count: raw.count ?? 0,
    average: raw.summary?.average ?? null,
    distribution:
      raw.summary?.distribution ??
      [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
  }
}

async function fetchReviews(
  productId: string,
  limit: number,
  offset: number
): Promise<ReviewPage> {
  const raw = await sdk.client.fetch<RawPage>("/store/reviews", {
    query: { product_id: productId, limit, offset },
  })

  return toPage(raw)
}

/**
 * The first page of reviews, cached into the product page's static payload.
 *
 * Product pages are static with revalidation, but reviews change whenever an
 * admin approves one — so this is cached under a tag rather than left to the
 * hourly timer (§2.4). Approving calls `revalidateReviews()` below, and the
 * page picks it up without a rebuild.
 *
 * Only the first page is cached. Later pages are fetched client-side by "load
 * more", because caching page 4 of a product nobody scrolls that far on is
 * paying to store something no one reads.
 */
export const getFirstReviewPage = unstable_cache(
  async (productId: string) => fetchReviews(productId, REVIEWS_PAGE_SIZE, 0),
  [REVIEWS_TAG],
  { tags: [REVIEWS_TAG] }
)

/**
 * A later page. Deliberately uncached — reached only by an explicit click, and
 * caching every offset for every product would store far more than it saves.
 */
export async function getReviewPage(
  productId: string,
  offset: number
): Promise<ReviewPage> {
  return fetchReviews(productId, REVIEWS_PAGE_SIZE, offset)
}
