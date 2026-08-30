import { MedusaService } from "@medusajs/framework/utils";

import Review from "./models/review";

/**
 * Generated CRUD only — listReviews, createReviews, updateReviews and friends.
 *
 * The rules that matter (proving the reviewer bought the product, hiding
 * unapproved reviews) live in the API routes rather than here, so that the
 * module stays a plain data store and the admin can moderate without fighting
 * the customer-facing guards.
 */
class ReviewModuleService extends MedusaService({ Review }) {}

export default ReviewModuleService;
