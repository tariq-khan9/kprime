import ProductModule from "@medusajs/medusa/product";
import { defineLink } from "@medusajs/framework/utils";

import ReviewModule from "../modules/review";

/**
 * Product -> Review.
 *
 * The review table already stores `product_id`, so this link is not what makes
 * the association possible — it is what makes it *queryable through Medusa's
 * graph*. Without it, listing products and their ratings means two round trips
 * and a manual join in application code; with it, `query.graph` can walk from a
 * product to its reviews in one pass.
 *
 * That matters for the denormalised aggregate (task 127) and for anything later
 * that wants ratings alongside products without the storefront stitching them
 * together itself.
 *
 * `isList` because one product has many reviews.
 */
export default defineLink(ProductModule.linkable.product, {
  linkable: ReviewModule.linkable.review,
  isList: true,
});
