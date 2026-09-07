import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { REVIEW_MODULE } from "../modules/review";

/**
 * Empties the catalogue so `seed.ts` can run again from clean.
 *
 * Run with: npx medusa exec ./src/scripts/reset-catalogue.ts
 *
 * `seed.ts` has no delete path — it assumes an empty store — so re-running it
 * over an existing catalogue collides on product handles, which are globally
 * unique. This is the missing half.
 *
 * **Orders are deliberately left alone.** Medusa snapshots line items onto the
 * order at placement, so a past order keeps its titles, quantities and prices
 * even after the product row is gone. Deleting orders to tidy up would throw
 * away the only real checkout history there is, and the display_id counter
 * would carry on regardless.
 *
 * Categories, tags and types are left too: `seed.ts` creates them idempotently
 * by handle and re-linking is cheaper than rebuilding the tree.
 */
export default async function resetCatalogue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve(Modules.PRODUCT);
  const pricingModule = container.resolve(Modules.PRICING);

  // ---- products (images, options and variants cascade with them) ----
  const products = await productModule.listProducts({}, { select: ["id"] });

  if (products.length) {
    await productModule.deleteProducts(products.map((product) => product.id));
  }

  logger.info(`Deleted ${products.length} products.`);

  // ---- inventory items ----
  //
  // These are a SEPARATE module and do not go with the product. A leftover item
  // keeps its SKU reserved, so the next seed dies with "Inventory item with sku:
  // PLW001-SINGLE-MICROFIBRE, already exists" — which names a SKU that no longer
  // belongs to any product and is baffling until you know inventory outlives the
  // catalogue.
  try {
    const inventoryModule = container.resolve(Modules.INVENTORY);
    const items = await inventoryModule.listInventoryItems({}, { select: ["id"] });

    if (items.length) {
      await inventoryModule.deleteInventoryItems(items.map((item) => item.id));
    }

    logger.info(`Deleted ${items.length} inventory items.`);
  } catch (error) {
    logger.warn(
      `Could not clear inventory items: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // ---- collections ----
  const collections = await productModule.listProductCollections(
    {},
    { select: ["id", "title"] }
  );

  if (collections.length) {
    await productModule.deleteProductCollections(
      collections.map((collection) => collection.id)
    );
  }

  logger.info(`Deleted ${collections.length} collections.`);

  // ---- the "Demo sale" price list ----
  //
  // seed-sale-prices.ts refuses to run if one already exists, so leaving it
  // behind would silently skip the sale prices on the next seed.
  try {
    const priceLists = await pricingModule.listPriceLists({}, { select: ["id"] });

    if (priceLists.length) {
      await pricingModule.deletePriceLists(priceLists.map((list) => list.id));
    }

    logger.info(`Deleted ${priceLists.length} price lists.`);
  } catch (error) {
    logger.warn(
      `Could not clear price lists: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // ---- reviews ----
  //
  // Every review names a product_id that is about to stop existing, so an
  // orphaned review would render nowhere and count towards nothing.
  try {
    const reviewService: any = container.resolve(REVIEW_MODULE);
    const reviews = await reviewService.listReviews({}, { select: ["id"] });

    if (reviews.length) {
      await reviewService.deleteReviews(reviews.map((review: any) => review.id));
    }

    logger.info(`Deleted ${reviews.length} reviews.`);
  } catch (error) {
    logger.warn(
      `Could not clear reviews: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  logger.info("Catalogue reset. Run seed.ts next.");
}
