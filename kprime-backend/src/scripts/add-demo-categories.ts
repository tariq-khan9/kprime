import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Extra top-level categories, for looking at the storefront with more than four.
 *
 * Run with: npx medusa exec ./src/scripts/add-demo-categories.ts
 *
 * DEMO DATA. These carry no products, so their listing pages are empty by
 * design — the point is to see how the home page's category row, the mega menu
 * and the footer behave once the taxonomy grows past the original four.
 *
 * Delete them in Admin > Products > Categories when you are done, or when the
 * real taxonomy lands in task 9. Idempotent: re-running skips any that exist.
 */

const DEMO_CATEGORIES = [
  { name: "Sports & Outdoors", handle: "sports-and-outdoors" },
  { name: "Toys & Games", handle: "toys-and-games" },
  { name: "Stationery", handle: "stationery" },
  { name: "Health & Wellness", handle: "health-and-wellness" },
];

export default async function addDemoCategories({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve(Modules.PRODUCT);

  const existing = await productModule.listProductCategories(
    {},
    { select: ["handle"] }
  );
  const taken = new Set(existing.map((category) => category.handle));

  // Handles are globally unique in this build (CLAUDE.md), so a clash is a hard
  // failure rather than something to work around.
  const toCreate = DEMO_CATEGORIES.filter((c) => !taken.has(c.handle));

  if (toCreate.length === 0) {
    logger.info("All demo categories already exist. Nothing to do.");
    return;
  }

  // Ranked after the existing top-level categories so the real ones keep their
  // position in the nav and these append at the end.
  const topLevelCount = existing.length;

  await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: toCreate.map((category, i) => ({
        name: category.name,
        handle: category.handle,
        is_active: true,
        rank: topLevelCount + i,
      })),
    },
  });

  for (const category of toCreate) {
    logger.info(`Created category: ${category.name} (/${category.handle})`);
  }

  logger.info(
    `Done. ${toCreate.length} added — the storefront caches categories, so ` +
      `restart it to see them.`
  );
}
