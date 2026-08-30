import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { REVIEW_MODULE } from "../../../../modules/review";

/**
 * The newest approved reviews across the whole catalogue, for the home page.
 *
 *   GET /store/reviews/recent?limit=8
 *
 * Approved only, and it returns the same fields the per-product endpoint does —
 * rating, title, content, date — plus the product they belong to so each one can
 * link somewhere. No email, no order id, no customer id: this is the most public
 * page on the site.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reviewService: any = req.scope.resolve(REVIEW_MODULE);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const requested = Number(req.query.limit);
  const limit = Number.isInteger(requested) && requested > 0 && requested <= 24
    ? requested
    : 8;

  const reviews = await reviewService.listReviews(
    { status: "approved" },
    { order: { created_at: "DESC" }, take: limit }
  );

  if (!reviews.length) {
    return res.json({ reviews: [] });
  }

  // One lookup for every product mentioned, rather than one per review.
  const productIds = [...new Set(reviews.map((r: any) => r.product_id))];
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail"],
    filters: { id: productIds as string[] },
  });

  const productById = new Map(products.map((p: any) => [p.id, p]));

  return res.json({
    reviews: reviews
      .map((review: any) => {
        const product = productById.get(review.product_id);
        // A review whose product has since been deleted has nowhere to point.
        if (!product) return null;

        return {
          id: review.id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          created_at: review.created_at,
          product: {
            title: product.title,
            handle: product.handle,
            thumbnail: product.thumbnail,
          },
        };
      })
      .filter(Boolean),
  });
}
