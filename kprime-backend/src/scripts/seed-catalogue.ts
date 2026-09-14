import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows";

import { CATEGORY_TREE, slugify } from "../data/catalogue";

/**
 * Seeds ONLY the category tree. No products, tags or types.
 *
 * Run with:
 *   npx medusa exec ./src/scripts/reset-catalogue.ts
 *   npx medusa exec ./src/scripts/seed-catalogue.ts
 *
 * **Why this is not just `seed.ts` again.** `seed.ts` builds the whole store
 * from nothing — region, sales channel, stock location, shipping profile, API
 * key — and none of that is re-runnable: Medusa rejects a second region for
 * Pakistan with "Countries with codes: pk are already assigned to a region",
 * and the publishable key would be reissued, breaking the key baked into the
 * storefront's `.env`. That infrastructure should be created once and left
 * alone.
 *
 * Idempotent: existing categories are looked up by handle and reused.
 */
export default async function seedCatalogue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve(Modules.PRODUCT);

  const existing = await productModule.listProductCategories(
    {},
    { select: ["id", "handle"] }
  );
  const idByHandle = new Map(existing.map((c) => [c.handle, c.id]));

  const missingParents = Object.keys(CATEGORY_TREE).filter(
    (name) => !idByHandle.has(slugify(name))
  );

  if (missingParents.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingParents.map((name) => ({
          name,
          handle: slugify(name),
          is_active: true,
        })),
      },
    });
    result.forEach((cat) => idByHandle.set(cat.handle, cat.id));
  }

  // A separate pass: a subcategory needs its parent's id, which only exists
  // once the pass above has committed.
  const missingSubs = Object.entries(CATEGORY_TREE).flatMap(([parent, subs]) =>
    subs
      .filter((name) => !idByHandle.has(slugify(name)))
      .map((name) => ({
        name,
        handle: slugify(name),
        is_active: true,
        parent_category_id: idByHandle.get(slugify(parent))!,
      }))
  );

  if (missingSubs.length) {
    await createProductCategoriesWorkflow(container).run({
      input: { product_categories: missingSubs },
    });
  }

  logger.info(
    `Categories seeded (${missingParents.length + missingSubs.length} created).`
  );
}
