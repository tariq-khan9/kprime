import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { REVIEW_MODULE } from "../modules/review";

/**
 * Empties the catalogue — products, categories, tags, types — so
 * `seed-catalogue.ts` can lay down the category tree from clean.
 *
 * Run with: npx medusa exec ./src/scripts/reset-catalogue.ts
 *
 * **Orders are deliberately left alone.** Medusa snapshots line items onto the
 * order at placement, so a past order keeps its titles, quantities and prices
 * even after the product row is gone. Deleting orders to tidy up would throw
 * away the only real checkout history there is, and the display_id counter
 * would carry on regardless.
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

  // ---- categories ----
  //
  // Deepest first: a category with children still pointing at it cannot go.
  let categories = await productModule.listProductCategories(
    {},
    { select: ["id", "parent_category_id"] }
  );
  const categoryCount = categories.length;

  while (categories.length) {
    const parents = new Set(categories.map((c) => c.parent_category_id));
    const leaves = categories.filter((c) => !parents.has(c.id));

    await productModule.deleteProductCategories(leaves.map((c) => c.id));

    const deleted = new Set(leaves.map((c) => c.id));
    categories = categories.filter((c) => !deleted.has(c.id));
  }

  logger.info(`Deleted ${categoryCount} categories.`);

  // ---- tags and types ----
  const tags = await productModule.listProductTags({}, { select: ["id"] });

  if (tags.length) {
    await productModule.deleteProductTags(tags.map((tag) => tag.id));
  }

  const types = await productModule.listProductTypes({}, { select: ["id"] });

  if (types.length) {
    await productModule.deleteProductTypes(types.map((type) => type.id));
  }

  logger.info(`Deleted ${tags.length} tags and ${types.length} types.`);

  logger.info("Catalogue reset. Run seed-catalogue.ts next.");
}
