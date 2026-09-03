import { model } from "@medusajs/framework/utils";

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/**
 * A customer's review of a product they bought.
 *
 * Reviews start `pending` and are invisible to the storefront until an admin
 * approves them. An open review form on a live store is a spam magnet, so
 * moderation is the default rather than a setting.
 *
 * The reviewer is identified by the order and the email that placed it, not by
 * `customer_id`: KPrime allows guest checkout, so most buyers have no account.
 * `customer_id` is recorded when there is one, for convenience only.
 */
const Review = model
  .define("review", {
    id: model.id({ prefix: "rev" }).primaryKey(),
    product_id: model.text(),
    order_id: model.text(),
    email: model.text(),
    customer_id: model.text().nullable(),
    /**
     * The buyer's name, copied from the order at submission.
     *
     * Stored rather than joined: the storefront shows a masked form ("Ahmed K.")
     * on every review, and resolving it live would mean an order lookup per row.
     * Copying it also freezes what was true when they wrote it — editing an
     * address later should not silently rewrite an old review's byline.
     */
    reviewer_name: model.text().nullable(),
    rating: model.number(),
    title: model.text().nullable(),
    content: model.text().nullable(),
    // Spread: `model.enum` wants a mutable array, and REVIEW_STATUSES is
    // `as const` so the status type can be derived from it.
    status: model.enum([...REVIEW_STATUSES]).default("pending"),
    /**
     * The review this one answers, for a merchant reply.
     *
     * Present even though only one level is ever rendered (§2.4). Threading is
     * unreadable at 360px, so the storefront draws replies flat and indented
     * once — but the column costs nothing now and a migration on a table with
     * real reviews in it costs a great deal later.
     */
    parent_id: model.text().nullable(),
  })
  .indexes([
    // Listing a product's approved reviews is the only hot read path.
    { on: ["product_id", "status"] },
    // One review per product per order. Buying the same thing twice earns a
    // second say; submitting the same order twice does not.
    //
    // Scoped to top-level rows. A merchant reply copies its parent's order and
    // product ids, so an unscoped unique index makes replying impossible — the
    // reply collides with the review it is answering.
    {
      on: ["order_id", "product_id"],
      unique: true,
      where: "parent_id IS NULL AND deleted_at IS NULL",
    },
    // Replies are fetched by the review they answer.
    { on: ["parent_id"] },
  ]);

export default Review;
