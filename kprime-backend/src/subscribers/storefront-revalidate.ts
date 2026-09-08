import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import {
  revalidateStorefront,
  type RevalidateTag,
} from "../lib/revalidate-storefront";

/**
 * Clears the storefront's cache whenever the catalogue changes in admin.
 *
 * **The event names here were measured, not read off the constants.**
 * `ProductEvents` in `@medusajs/utils` spells them with the module prefix
 * (`product.product-variant.updated`), but what the event bus actually
 * dispatches for an admin edit is the unprefixed form below — several edits
 * emit both, and subscribing to both would fire this twice for one save.
 *
 * Variant events matter on their own: changing a price in admin emits
 * `product-variant.updated` and **not** `product.updated`, so a products-only
 * subscription would miss the single most common edit a shop makes.
 *
 * Everything here maps to `products` except category and collection changes,
 * which also touch their own tag.
 */
const TAGS_BY_EVENT: Record<string, RevalidateTag[]> = {
  "product.created": ["products"],
  "product.updated": ["products"],
  "product.deleted": ["products"],

  "product-variant.created": ["products"],
  "product-variant.updated": ["products"],
  "product-variant.deleted": ["products"],

  // Stock changes decide whether the card says "in stock" or "sold out".
  "inventory-level.updated": ["products"],

  // Price lists — the "Demo sale". Editing one emits no product or variant
  // event, only these, so without them a sale price would be the one edit that
  // still waited an hour. Verified by probing the bus: creating, updating and
  // deleting a price-list price emitted exactly `pricing.price.created`,
  // `.updated` and `.deleted` and nothing else.
  "pricing.price.created": ["products"],
  "pricing.price.updated": ["products"],
  "pricing.price.deleted": ["products"],

  "product-collection.created": ["collections", "products"],
  "product-collection.updated": ["collections", "products"],
  "product-collection.deleted": ["collections", "products"],

  // Categories invalidate `products` too: a listing's product set is derived
  // from the category tree, so moving a category changes what a page shows
  // without any product itself having changed.
  "product-category.created": ["categories", "products"],
  "product-category.updated": ["categories", "products"],
  "product-category.deleted": ["categories", "products"],
};

export default async function storefrontRevalidateHandler({
  event,
  container,
}: SubscriberArgs<unknown>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const tags = TAGS_BY_EVENT[event.name];

  if (!tags) {
    return;
  }

  revalidateStorefront(tags, logger);
}

export const config: SubscriberConfig = {
  event: Object.keys(TAGS_BY_EVENT),
};
