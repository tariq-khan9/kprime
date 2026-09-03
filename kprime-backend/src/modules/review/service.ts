import { MedusaService } from "@medusajs/framework/utils";

import Review, { type ReviewStatus } from "./models/review";

export type ListForProductOptions = {
  status?: ReviewStatus;
  limit?: number;
  offset?: number;
};

export type CreateReviewInput = {
  product_id: string;
  order_id: string;
  email: string;
  rating: number;
  title?: string | null;
  content?: string | null;
  customer_id?: string | null;
  /** Copied from the order, so the byline never needs an order lookup. */
  reviewer_name?: string | null;
};

/**
 * Reviews.
 *
 * The generated CRUD (`listReviews`, `createReviews`, …) stays available; the
 * methods below are the vocabulary the routes actually speak, so that "approve"
 * means one thing in one place rather than an `updateReviews` call spelled
 * slightly differently at each call site.
 *
 * Purchase verification deliberately stays in the API layer, not here: it needs
 * the order graph, which belongs to another module, and pulling it in would tie
 * this module to Medusa's order model for no gain. This module stays a store of
 * reviews with rules about their own lifecycle.
 */
class ReviewModuleService extends MedusaService({ Review }) {
  /**
   * One product's reviews, newest first.
   *
   * Defaults to `approved`, so a caller that forgets to pass a status cannot
   * accidentally leak pending ones to the storefront. Replies are excluded —
   * they belong under their parent, not in the top-level list.
   */
  async listForProduct(
    productId: string,
    { status = "approved", limit = 10, offset = 0 }: ListForProductOptions = {}
  ) {
    return this.listReviews(
      { product_id: productId, status, parent_id: null },
      { order: { created_at: "DESC" }, take: limit, skip: offset }
    );
  }

  /** Total for a product, so the storefront can page without over-fetching. */
  async countForProduct(
    productId: string,
    status: ReviewStatus = "approved"
  ): Promise<number> {
    const [, count] = await this.listAndCountReviews({
      product_id: productId,
      status,
      parent_id: null,
    });

    return count;
  }

  /**
   * A new review, always `pending`.
   *
   * The status is forced rather than defaulted: a caller that passed
   * `status: "approved"` would publish straight to the storefront, and on a COD
   * store an open review form attracts spam within a week (§2.4).
   */
  async submit(input: CreateReviewInput) {
    return this.createReviews({
      ...input,
      status: "pending" as const,
      parent_id: null,
    });
  }

  async approve(id: string) {
    return this.updateReviews({ id, status: "approved" as const });
  }

  /**
   * Rejected, not deleted.
   *
   * Keeping the row is what stops the same person resubmitting the same review
   * after it was turned down, and leaves a moderation trail.
   */
  async reject(id: string) {
    return this.updateReviews({ id, status: "rejected" as const });
  }

  /**
   * The shop's answer to a review.
   *
   * Approved on creation, because the shop is the one writing it — there is
   * nobody to moderate the moderator. Stored as a review row with `parent_id`
   * set, so one table holds both and a reply can never outlive its parent
   * unnoticed.
   *
   * Only one level is ever rendered (§2.4); nothing here prevents a deeper
   * chain, but the storefront does not draw one.
   */
  async reply(parentId: string, content: string) {
    const parent = await this.retrieveReview(parentId);

    return this.createReviews({
      product_id: parent.product_id,
      order_id: parent.order_id,
      email: parent.email,
      // A reply carries no rating of its own; it is not a second opinion on the
      // product. Zero keeps the column non-null without polluting the average,
      // which only ever counts rows with `parent_id: null`.
      rating: 0,
      content,
      parent_id: parentId,
      status: "approved" as const,
    });
  }

  /** Replies for a set of reviews, so a list can be hydrated in one query. */
  async listReplies(parentIds: string[]) {
    if (parentIds.length === 0) {
      return [];
    }

    return this.listReviews(
      { parent_id: parentIds, status: "approved" },
      { order: { created_at: "ASC" } }
    );
  }
}

export default ReviewModuleService;
