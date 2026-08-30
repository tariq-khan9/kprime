import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { REVIEW_MODULE } from "../../../modules/review";

/**
 * Product reviews, customer side.
 *
 * GET  /store/reviews?product_id=prod_123   approved reviews + rating summary
 * POST /store/reviews                       submit one, held for moderation
 *
 * Submission is gated on proof of purchase, using the same shared secret as
 * guest order tracking: the order number plus the email that placed it. KPrime
 * allows guest checkout, so requiring a logged-in customer would lock out most
 * real buyers.
 *
 * As with /store/order-lookup, a wrong order number and a wrong email return the
 * identical error, so this cannot be used to discover which orders exist.
 *
 * Not rate limited — see the note on /store/order-lookup. Both need one before
 * the store is publicly reachable.
 */

type SubmitBody = {
  order_number?: string | number;
  email?: string;
  product_id?: string;
  rating?: number | string;
  title?: string;
  content?: string;
};

const GENERIC_ERROR =
  "We couldn't match that order number and email. Check both and try again.";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.query.product_id;

  if (typeof productId !== "string" || !productId) {
    return res.status(400).json({ message: "product_id is required." });
  }

  const reviewService: any = req.scope.resolve(REVIEW_MODULE);

  // Approved only. Pending and rejected reviews must never reach the storefront.
  const reviews = await reviewService.listReviews(
    { product_id: productId, status: "approved" },
    { order: { created_at: "DESC" }, take: 50 }
  );

  const count = reviews.length;
  const average =
    count === 0
      ? null
      : Math.round(
          (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count) *
            10
        ) / 10;

  return res.json({
    // Deliberately no reviewer name. Every review here is purchase-verified, so
    // "verified buyer" carries the trust a name would, without publishing a
    // customer's name on a page anyone can read.
    reviews: reviews.map((review: any) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      content: review.content,
      created_at: review.created_at,
    })),
    summary: { average, count },
  });
}

export async function POST(
  req: MedusaRequest<SubmitBody>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const reviewService: any = req.scope.resolve(REVIEW_MODULE);

  const { product_id: productId, title, content } = req.body ?? {};

  // Same paste-tolerant parsing as /store/order-lookup: people send " #22 ".
  const rawNumber = req.body?.order_number;
  const orderNumber = Number(
    typeof rawNumber === "string"
      ? rawNumber.trim().replace(/^#/, "").trim()
      : rawNumber
  );
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const rating = Number(req.body?.rating);

  if (!Number.isInteger(orderNumber) || orderNumber <= 0 || !email || !productId) {
    return res.status(400).json({
      message:
        "An order number, the email used at checkout, and a product are all required.",
    });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });
  }

  const { data: matches } = await query.graph({
    entity: "order",
    fields: ["id"],
    // query.graph types display_id as a string even though the column is an int.
    filters: { display_id: String(orderNumber) },
  });

  const candidate = matches?.[0];

  const { data: orders } = candidate
    ? await query.graph({
        entity: "order",
        fields: [
          "id",
          "email",
          "status",
          "customer_id",
          "items.product_id",
          "items.title",
        ],
        filters: { id: candidate.id },
      })
    : { data: [] };

  const order = orders?.[0];

  if (!order || (order.email ?? "").trim().toLowerCase() !== email) {
    return res.status(404).json({ message: GENERIC_ERROR });
  }

  // A cancelled order means the buyer never received the product, so they are in
  // no position to review it — and cancelling then reviewing would be an easy
  // way to manufacture "verified" reviews.
  if (order.status === "canceled") {
    return res.status(403).json({
      message: "That order was cancelled, so it can't be reviewed.",
    });
  }

  const boughtIt = (order.items ?? [])
    .filter(Boolean)
    .some((item: any) => item.product_id === productId);

  if (!boughtIt) {
    return res.status(403).json({
      message: "That order doesn't include this product.",
    });
  }

  try {
    const [review] = await reviewService.createReviews([
      {
        product_id: productId,
        order_id: order.id,
        email,
        customer_id: order.customer_id ?? null,
        rating,
        title: typeof title === "string" && title.trim() ? title.trim() : null,
        content:
          typeof content === "string" && content.trim() ? content.trim() : null,
      },
    ]);

    // 202, not 201: the review exists but is not public yet. Saying "published"
    // here and then showing nothing on the product page reads as a broken form.
    return res.status(202).json({
      review: { id: review.id, status: review.status },
      message: "Thanks — your review will appear once it has been checked.",
    });
  } catch (error) {
    // The unique index on (order_id, product_id) is the only constraint that can
    // realistically fire here.
    if (/unique|duplicate|already exists/i.test((error as Error).message)) {
      return res.status(409).json({
        message: "You have already reviewed this product for that order.",
      });
    }
    throw error;
  }
}
