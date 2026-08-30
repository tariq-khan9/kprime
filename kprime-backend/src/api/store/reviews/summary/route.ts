import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { REVIEW_MODULE } from "../../../../modules/review";

/**
 * Rating summaries for many products at once.
 *
 *   GET /store/reviews/summary?product_ids=prod_1,prod_2
 *
 * A product grid shows a dozen cards; asking /store/reviews once per card would
 * be a dozen round trips to render one page. Returns counts and averages only —
 * never review rows, so there is nothing here to leak.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw = req.query.product_ids;
  const productIds = (typeof raw === "string" ? raw.split(",") : [])
    .map((id) => id.trim())
    .filter(Boolean);

  if (!productIds.length) {
    return res.status(400).json({ message: "product_ids is required." });
  }

  const reviewService: any = req.scope.resolve(REVIEW_MODULE);

  const reviews = await reviewService.listReviews(
    { product_id: productIds, status: "approved" },
    { select: ["product_id", "rating"] }
  );

  const totals = new Map<string, { sum: number; count: number }>();
  for (const review of reviews) {
    const entry = totals.get(review.product_id) ?? { sum: 0, count: 0 };
    entry.sum += review.rating;
    entry.count += 1;
    totals.set(review.product_id, entry);
  }

  // Every requested id gets an entry, so the caller never has to distinguish
  // "no reviews" from "product not asked about".
  const summaries = Object.fromEntries(
    productIds.map((id) => {
      const entry = totals.get(id);
      return [
        id,
        entry
          ? { average: Math.round((entry.sum / entry.count) * 10) / 10, count: entry.count }
          : { average: null, count: 0 },
      ];
    })
  );

  return res.json({ summaries });
}
