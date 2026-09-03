"use server"

import { revalidatePath, revalidateTag } from "next/cache"

import { getReviewPage, REVIEWS_TAG, type ReviewPage } from "@/lib/data/reviews"
import { sdk } from "@/lib/sdk"

export type SubmitReviewInput = {
  productId: string
  orderNumber: string
  /** Raw, as typed. Normalised at the API boundary, never here (§2.2). */
  phone: string
  rating: number
  title?: string
  content?: string
}

export type SubmitReviewResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

/**
 * Submits a review for moderation.
 *
 * Never optimistic. The review is created `pending` and stays invisible until
 * an admin approves it, so the caller is told exactly that — showing it on the
 * page immediately and having it vanish on reload is worse than waiting (§2.4).
 */
export async function submitReviewAction(
  input: SubmitReviewInput
): Promise<SubmitReviewResult> {
  try {
    const response = await sdk.client.fetch<{ message?: string }>(
      "/store/reviews",
      {
        method: "POST",
        body: {
          product_id: input.productId,
          order_number: input.orderNumber,
          phone: input.phone,
          rating: input.rating,
          title: input.title,
          content: input.content,
        },
      }
    )

    return {
      ok: true,
      message:
        response.message ??
        "Thanks — your review will appear once it has been checked.",
    }
  } catch (error) {
    // Medusa's SDK throws on non-2xx and puts the body message on the error.
    // These messages are written for shoppers ("You can review this once your
    // order has been delivered"), so they pass through as-is.
    const message = error instanceof Error ? error.message : ""

    return {
      ok: false,
      message:
        message.trim() ||
        "We could not submit your review. Please check your details and try again.",
    }
  }
}

/** "Load more" on the review list. */
export async function loadReviewPageAction(
  productId: string,
  offset: number
): Promise<ReviewPage> {
  return getReviewPage(productId, offset)
}

/**
 * Drops the cached first page after moderation.
 *
 * Exported for an admin-side hook or a webhook to call. Product pages are
 * static, so without this an approved review would not appear until the hourly
 * revalidation caught up.
 */
export async function revalidateReviews(productHandle?: string): Promise<void> {
  revalidateTag(REVIEWS_TAG, "max")

  if (productHandle) {
    revalidatePath(`/products/${productHandle}`)
  }
}
