import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { REVIEW_MODULE } from "../../../modules/review";

/**
 * Review moderation queue.
 *
 *   GET /admin/reviews?status=pending
 *
 * Routes under /admin are authenticated by the framework, so there is no
 * auth check here. Defaults to `pending`, because the only reason to open this
 * page is to clear the queue.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reviewService: any = req.scope.resolve(REVIEW_MODULE);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const status = req.query.status;
  const filters =
    status === "all" ? {} : { status: typeof status === "string" ? status : "pending" };

  const reviews = await reviewService.listReviews(filters, {
    order: { created_at: "DESC" },
    take: 100,
  });

  // Moderating without knowing what was reviewed is guesswork, so resolve the
  // product titles in one go rather than N lookups from the admin page.
  const productIds = [...new Set(reviews.map((r: any) => r.product_id))];
  const { data: products } = productIds.length
    ? await query.graph({
        entity: "product",
        fields: ["id", "title", "handle"],
        filters: { id: productIds as string[] },
      })
    : { data: [] };

  const productById = new Map(products.map((p: any) => [p.id, p]));

  return res.json({
    reviews: reviews.map((review: any) => ({
      ...review,
      product: productById.get(review.product_id) ?? null,
    })),
    count: reviews.length,
  });
}
