import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { recomputeProductRating } from "../../../../lib/recompute-product-rating";
import { REVIEW_MODULE } from "../../../../modules/review";
import { REVIEW_STATUSES } from "../../../../modules/review/models/review";

/**
 * Moderate one review.
 *
 *   POST   /admin/reviews/:id   { "status": "approved" }
 *   POST   /admin/reviews/:id   { "reply": "Thanks for letting us know." }
 *   DELETE /admin/reviews/:id
 *
 * Approving is what publishes a review — nothing reaches the storefront until
 * this runs.
 *
 * Every path that can change what is publicly visible recomputes the product's
 * stored rating afterwards (§2.4). Doing it here rather than in a subscriber
 * keeps it synchronous: the admin sees the new average immediately, and there
 * is no window where the product page and the review list disagree.
 */
export async function POST(
  req: MedusaRequest<{ status?: string; reply?: string }>,
  res: MedusaResponse
) {
  const reviewService: any = req.scope.resolve(REVIEW_MODULE);
  const { status, reply } = req.body ?? {};

  // A reply is a different action from a status change, so it is handled first
  // and returns on its own rather than falling through to the status branch.
  if (typeof reply === "string") {
    if (!reply.trim()) {
      return res.status(400).json({ message: "A reply cannot be empty." });
    }

    const created = await reviewService.reply(req.params.id, reply.trim());

    return res.json({ reply: created });
  }

  if (!status || !REVIEW_STATUSES.includes(status as any)) {
    return res.status(400).json({
      message: `status must be one of: ${REVIEW_STATUSES.join(", ")}.`,
    });
  }

  const [review] = await reviewService.updateReviews([
    { id: req.params.id, status },
  ]);

  // Approving adds a rating to the average; rejecting removes one. Both have to
  // recompute, or a rejected review keeps counting towards the score.
  const rating = await recomputeProductRating(req.scope, review.product_id);

  return res.json({ review, product_rating: rating });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const reviewService: any = req.scope.resolve(REVIEW_MODULE);

  // Read before deleting: the product id is needed to recompute afterwards, and
  // it is gone once the row is.
  const review = await reviewService
    .retrieveReview(req.params.id)
    .catch(() => null);

  await reviewService.deleteReviews([req.params.id]);

  if (review?.product_id) {
    await recomputeProductRating(req.scope, review.product_id);
  }

  return res.json({ id: req.params.id, object: "review", deleted: true });
}
