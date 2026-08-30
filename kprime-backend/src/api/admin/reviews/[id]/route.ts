import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { REVIEW_MODULE } from "../../../../modules/review";
import { REVIEW_STATUSES } from "../../../../modules/review/models/review";

/**
 * Approve or reject one review.
 *
 *   POST /admin/reviews/:id   { "status": "approved" }
 *
 * Approving is what publishes a review — nothing reaches the storefront until
 * this runs.
 */
export async function POST(
  req: MedusaRequest<{ status?: string }>,
  res: MedusaResponse
) {
  const reviewService: any = req.scope.resolve(REVIEW_MODULE);
  const status = req.body?.status;

  if (!status || !REVIEW_STATUSES.includes(status as any)) {
    return res.status(400).json({
      message: `status must be one of: ${REVIEW_STATUSES.join(", ")}.`,
    });
  }

  const [review] = await reviewService.updateReviews([
    { id: req.params.id, status },
  ]);

  return res.json({ review });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const reviewService: any = req.scope.resolve(REVIEW_MODULE);

  await reviewService.deleteReviews([req.params.id]);

  return res.json({ id: req.params.id, object: "review", deleted: true });
}
