import { definePolicies } from "@medusajs/framework/utils";

/**
 * Permissions for the custom reviews admin routes.
 *
 * Core routes carry policies out of the box; a custom route carries none, and a
 * route with no policy is open to every logged-in admin regardless of role.
 * Registering these makes "review" assignable in Settings → Roles and lets
 * `api/middlewares.ts` guard the routes.
 */
export const reviewPolicies = definePolicies([
  { name: "ReadReviews", resource: "review", operation: "read", description: "Read product reviews" },
  { name: "UpdateReviews", resource: "review", operation: "update", description: "Moderate product reviews" },
  { name: "DeleteReviews", resource: "review", operation: "delete", description: "Delete product reviews" },
]);
