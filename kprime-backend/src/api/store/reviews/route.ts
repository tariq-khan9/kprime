import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { REVIEW_MODULE } from "../../../modules/review";

/**
 * Product reviews, customer side.
 *
 * GET  /store/reviews?product_id=prod_123&limit=10&offset=0
 * POST /store/reviews
 *
 * **Submission is gated on a delivered purchase.** The proof is the same pair
 * that guest order tracking uses — the order number plus the phone that placed
 * it. There are no accounts (§2.2), so requiring a logged-in customer would
 * lock out every real buyer; the order number is something only the person who
 * ordered has.
 *
 * A wrong order number and a wrong phone return the identical error, so this
 * cannot be used to discover which orders exist.
 */

const SYNTHETIC_DOMAIN = "nomail.kprime.pk";

const NORMALISED = /^923\d{9}$/;
const SEPARATORS = /[\s\-().]/g;

/** Mirrors `normalizePhone` in the storefront and /store/track. Keep in step. */
function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) {
    return null;
  }

  let digits = raw.replace(SEPARATORS, "").trim();

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (!/^\d+$/.test(digits)) {
    return null;
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("92")) {
    if (digits.startsWith("920")) {
      digits = `92${digits.slice(3)}`;
    }
  } else if (digits.startsWith("0")) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.startsWith("3")) {
    digits = `92${digits}`;
  }

  return NORMALISED.test(digits) ? digits : null;
}

const GENERIC_ERROR =
  "We couldn't match that order number and phone. Check both and try again.";

/** `Ahmed Khan` -> `Ahmed K.`  A first name and an initial, never more. */
function maskName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "Verified buyer";
  }

  const [first, ...rest] = parts;
  const initial = rest.length ? ` ${rest[rest.length - 1][0].toUpperCase()}.` : ""

  return `${first}${initial}`;
}

const MAX_LIMIT = 50;

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.query.product_id;

  if (typeof productId !== "string" || !productId) {
    return res.status(400).json({ message: "product_id is required." });
  }

  const reviewService: any = req.scope.resolve(REVIEW_MODULE);

  // Capped, so a hand-edited limit cannot ask for the whole table.
  const limit = Math.min(
    Math.max(Number(req.query.limit) || 10, 1),
    MAX_LIMIT
  );
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  // Approved only, top-level only. Pending and rejected must never reach the
  // storefront, and replies belong under their parent rather than in the list.
  const [reviews, count] = await reviewService.listAndCountReviews(
    { product_id: productId, status: "approved", parent_id: null },
    { order: { created_at: "DESC" }, take: limit, skip: offset }
  );

  const replies = await reviewService.listReplies(
    reviews.map((review: any) => review.id)
  );

  const repliesByParent = new Map<string, any>();

  for (const reply of replies) {
    // First reply wins. The model allows more; the storefront draws one (§2.4).
    if (!repliesByParent.has(reply.parent_id)) {
      repliesByParent.set(reply.parent_id, reply);
    }
  }

  // The whole-product average, not the average of this page.
  const all = await reviewService.listReviews(
    { product_id: productId, status: "approved", parent_id: null },
    { select: ["rating"] }
  );

  const average =
    all.length === 0
      ? null
      : Math.round(
          (all.reduce((sum: number, r: any) => sum + r.rating, 0) / all.length) *
            10
        ) / 10;

  // 5 -> 1, for the distribution bars on the summary (task 131).
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: all.filter((r: any) => r.rating === stars).length,
  }));

  return res.json({
    reviews: reviews.map((review: any) => {
      const reply = repliesByParent.get(review.id);

      return {
        id: review.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        created_at: review.created_at,
        // Masked, never the full name and never the phone or email.
        author: maskName(review.reviewer_name),
        // Every review here passed the delivered-purchase check to exist.
        verified_buyer: true,
        reply: reply
          ? { id: reply.id, content: reply.content, created_at: reply.created_at }
          : null,
      };
    }),
    count,
    limit,
    offset,
    summary: { average, count: all.length, distribution },
  });
}

type SubmitBody = {
  order_number?: string | number;
  /** Preferred. `email` is still accepted for the older client. */
  phone?: string;
  email?: string;
  product_id?: string;
  rating?: number | string;
  title?: string;
  content?: string;
};

export async function POST(
  req: MedusaRequest<SubmitBody>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const reviewService: any = req.scope.resolve(REVIEW_MODULE);

  const { product_id: productId, title, content } = req.body ?? {};

  // Paste-tolerant: people send " #22 ".
  const rawNumber = req.body?.order_number;
  const orderNumber = Number(
    typeof rawNumber === "string"
      ? rawNumber.trim().replace(/^#/, "").trim()
      : rawNumber
  );

  // The phone is the identity. The synthetic address is derived from it and
  // nothing else, which is what lets a phone match an order placed by a guest.
  const phone = normalizePhone(req.body?.phone);

  const email = phone
    ? `${phone}@${SYNTHETIC_DOMAIN}`
    : typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  const rating = Number(req.body?.rating);

  if (!Number.isInteger(orderNumber) || orderNumber <= 0 || !email || !productId) {
    return res.status(400).json({
      message:
        "An order number, the phone used at checkout, and a product are all required.",
    });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ message: "Rating must be a whole number from 1 to 5." });
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
          "shipping_address.first_name",
          "shipping_address.last_name",
          "shipping_address.phone",
          "fulfillments.delivered_at",
        ],
        filters: { id: candidate.id },
      })
    : { data: [] };

  const order = orders?.[0];

  const addressPhone = normalizePhone(order?.shipping_address?.phone);

  const identityMatches =
    order &&
    ((order.email ?? "").trim().toLowerCase() === email ||
      (phone !== null && addressPhone === phone));

  if (!order || !identityMatches) {
    return res.status(404).json({ message: GENERIC_ERROR });
  }

  const boughtIt = (order.items ?? [])
    .filter(Boolean)
    .some((item: any) => item.product_id === productId);

  if (!boughtIt) {
    return res
      .status(403)
      .json({ message: "That order doesn't include this product." });
  }

  // **Delivered, not merely placed.** On a COD store the buyer has not seen the
  // product until the rider hands it over, and refusal at the door is common —
  // reviewing before that is reviewing something you may never receive.
  const delivered = (order.fulfillments ?? [])
    .filter(Boolean)
    .some((f: any) => f?.delivered_at);

  if (!delivered) {
    return res.status(403).json({
      message:
        "You can review this once your order has been delivered. We mark it delivered after the rider confirms.",
    });
  }

  // One review per person per product, not merely per order. Ordering the same
  // thing twice does not earn a second say on the same page.
  const existing = await reviewService.listReviews(
    { product_id: productId, email, parent_id: null },
    { select: ["id"], take: 1 }
  );

  if (existing.length > 0) {
    return res
      .status(409)
      .json({ message: "You have already reviewed this product." });
  }

  const reviewerName =
    [order.shipping_address?.first_name, order.shipping_address?.last_name]
      .filter(Boolean)
      .join(" ") || null;

  try {
    const review = await reviewService.submit({
      product_id: productId,
      order_id: order.id,
      email,
      customer_id: order.customer_id ?? null,
      reviewer_name: reviewerName,
      rating,
      title: typeof title === "string" && title.trim() ? title.trim() : null,
      content:
        typeof content === "string" && content.trim() ? content.trim() : null,
    });

    // 202, not 201: the review exists but is not public yet. Saying "published"
    // and then showing nothing on the product page reads as a broken form.
    return res.status(202).json({
      review: { id: review.id, status: review.status },
      message: "Thanks — your review will appear once it has been checked.",
    });
  } catch (error) {
    if (/unique|duplicate|already exists/i.test((error as Error).message)) {
      return res
        .status(409)
        .json({ message: "You have already reviewed this product." });
    }

    throw error;
  }
}
