import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";

import { REVIEW_MODULE } from "../modules/review";

/**
 * Recomputes a product's stored rating.
 *
 * **Denormalised on purpose (§2.4).** A 24-product category grid that computed
 * averages on read would fire 24 aggregate queries to render one page. Storing
 * the result means the grid reads what it already fetches and asks for nothing
 * extra.
 *
 * Kept on `product.metadata` rather than in a table of its own: the storefront
 * already loads products through one query, and metadata rides along with no
 * join. It is display-only — filtering and sorting by rating happen in the
 * Next.js server layer (task 136), because JSONB is not queryable through the
 * store API.
 *
 * Called after approve, reject and delete. Not after *create*: a pending review
 * is invisible, and letting it move the average would publish a rating before a
 * human had seen the words attached to it.
 *
 * Replies (`parent_id` set) carry `rating: 0` and are excluded — they are the
 * shop talking, not a customer scoring anything.
 */
export async function recomputeProductRating(
  container: MedusaContainer,
  productId: string
): Promise<{ average: number | null; count: number }> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const reviewService: any = container.resolve(REVIEW_MODULE);
  const productModule = container.resolve(Modules.PRODUCT);

  const approved = await reviewService.listReviews(
    { product_id: productId, status: "approved", parent_id: null },
    { select: ["rating"] }
  );

  const count = approved.length;

  const average =
    count === 0
      ? null
      : // One decimal place. More precision than that is noise on a five-point
        // scale and reads as false accuracy.
        Math.round(
          (approved.reduce((sum: number, r: any) => sum + r.rating, 0) / count) *
            10
        ) / 10;

  try {
    const product = await productModule.retrieveProduct(productId, {
      select: ["id", "metadata"],
    });

    await productModule.updateProducts(productId, {
      metadata: {
        ...(product.metadata ?? {}),
        average_rating: average,
        review_count: count,
      },
    });
  } catch (error) {
    // A missing product must not break moderation. The admin still needs to be
    // able to approve or reject the review itself.
    logger.warn(
      `recomputeProductRating: could not update ${productId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return { average, count };
}
