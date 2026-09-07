import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createProductTagsWorkflow,
  createProductTypesWorkflow,
} from "@medusajs/medusa/core-flows";

import {
  buildCatalogue,
  CATEGORY_TREE,
  PRODUCT_TAGS,
  skuPart,
  slugify,
  type ProductBlueprint,
} from "../data/catalogue";

/**
 * Re-seeds ONLY the catalogue: categories, tags, types, products, stock.
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
 * alone. Only the catalogue is disposable, so only the catalogue lives here.
 *
 * Everything here is idempotent: existing categories, tags and types are looked
 * up by handle or value and reused, so this can run repeatedly.
 */
const CURRENCY = "pkr";

const DEFAULT_STOCK = 40;

/**
 * Deliberate stock states, so the storefront's out-of-stock and low-stock paths
 * are exercised by the seed rather than only in production. SKUs come from
 * `skuBase` plus the option values — see `buildCatalogue`.
 */
const STOCK_BY_SKU: Record<string, number> = {
  // One variant of a multi-variant product: the selector must disable a single
  // choice rather than the whole product.
  "PWB001-5000MAH-WHITE": 0,
  "BSS001-KING-BEIGE": 0,
  // The only variant there is, so the whole product reads unavailable.
  "HPH001-WIRELESS-INEAR": 0,
  // Low stock, spread across leaves so several listings show the badge.
  "KBD001-BLUE-TKL": 3,
  "LIP001-RUBY-MATTE": 4,
  "KET001-17L-STEEL": 6,
  "FRY001-28CM-NONSTICK": 7,
  "CBL001-2M-BLACK": 9,
  "BSS001-QUEEN-WHITE": 12,
};

/** Variants are the cartesian product of whatever options the product declares. */
const buildVariants = (product: ProductBlueprint) => {
  const combinations = product.options.reduce<Record<string, string>[]>(
    (acc, option) =>
      acc.flatMap((combo) =>
        option.values.map((value) => ({ ...combo, [option.title]: value }))
      ),
    [{}]
  );

  return combinations.map((combo) => {
    const values = product.options.map((option) => combo[option.title]);
    return {
      title: values.join(" / "),
      sku: [product.skuBase, ...values.map(skuPart)].join("-"),
      options: combo,
      prices: [{ amount: product.price, currency_code: CURRENCY }],
    };
  });
};

export default async function seedCatalogue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);

  const blueprints = buildCatalogue();

  // ---- infrastructure that must already exist ----
  const [salesChannel] = await salesChannelModule.listSalesChannels(
    { name: "Default Sales Channel" },
    { take: 1 }
  );
  const [stockLocation] = await stockLocationModule.listStockLocations(
    {},
    { take: 1 }
  );
  const [shippingProfile] = await fulfillmentModule.listShippingProfiles(
    { type: "default" },
    { take: 1 }
  );

  if (!salesChannel || !stockLocation || !shippingProfile) {
    throw new Error(
      "Store infrastructure is missing. Run seed.ts once on an empty database first."
    );
  }

  // ---- categories (idempotent by handle) ----
  const existingCategories = await productModule.listProductCategories(
    {},
    { select: ["id", "name", "handle"] }
  );

  const categoryIdByName = new Map(
    existingCategories.map((category) => [category.name, category.id])
  );
  const takenHandles = new Set(existingCategories.map((c) => c.handle));

  const missingParents = Object.keys(CATEGORY_TREE).filter(
    (name) => !takenHandles.has(slugify(name))
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
    result.forEach((cat) => categoryIdByName.set(cat.name, cat.id));
  }

  // Level 2, the subcategories.
  const missingSubs = Object.entries(CATEGORY_TREE).flatMap(([parent, subs]) =>
    Object.keys(subs)
      .filter((name) => !takenHandles.has(slugify(name)))
      .map((name) => ({
        name,
        handle: slugify(name),
        is_active: true,
        parent_category_id: categoryIdByName.get(parent)!,
      }))
  );

  if (missingSubs.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: missingSubs },
    });
    result.forEach((cat) => categoryIdByName.set(cat.name, cat.id));
  }

  // Level 3, the leaves that actually hold products.
  //
  // A separate pass, not one flatMap: a leaf needs its subcategory's id, and
  // that id only exists once the pass above has committed.
  const missingLeaves = Object.values(CATEGORY_TREE).flatMap((subs) =>
    Object.entries(subs).flatMap(([sub, leaves]) =>
      leaves
        .filter((name) => !takenHandles.has(slugify(name)))
        .map((name) => ({
          name,
          handle: slugify(name),
          is_active: true,
          parent_category_id: categoryIdByName.get(sub)!,
        }))
    )
  );

  if (missingLeaves.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: missingLeaves },
    });
    result.forEach((cat) => categoryIdByName.set(cat.name, cat.id));
  }

  logger.info(
    `Categories: ${categoryIdByName.size} available ` +
      `(${missingParents.length + missingSubs.length + missingLeaves.length} created).`
  );

  // ---- tags and types (idempotent by value) ----
  const existingTags = await productModule.listProductTags(
    {},
    { select: ["id", "value"] }
  );
  const tagIdByValue = new Map(existingTags.map((tag) => [tag.value, tag.id]));

  const missingTags = PRODUCT_TAGS.filter((value) => !tagIdByValue.has(value));

  if (missingTags.length) {
    const { result } = await createProductTagsWorkflow(container).run({
      input: { product_tags: missingTags.map((value) => ({ value })) },
    });
    result.forEach((tag) => tagIdByValue.set(tag.value, tag.id));
  }

  const existingTypes = await productModule.listProductTypes(
    {},
    { select: ["id", "value"] }
  );
  const typeIdByValue = new Map(
    existingTypes.map((type) => [type.value, type.id])
  );

  const wantedTypes = [...new Set(blueprints.map((b) => b.type))];
  const missingTypes = wantedTypes.filter((value) => !typeIdByValue.has(value));

  if (missingTypes.length) {
    const { result } = await createProductTypesWorkflow(container).run({
      input: { product_types: missingTypes.map((value) => ({ value })) },
    });
    result.forEach((type) => typeIdByValue.set(type.value, type.id));
  }

  logger.info(
    `Tags: ${tagIdByValue.size}, types: ${typeIdByValue.size} available.`
  );

  // ---- products ----
  logger.info(`Creating ${blueprints.length} products...`);

  await createProductsWorkflow(container).run({
    input: {
      products: blueprints.map((blueprint) => ({
        title: blueprint.title,
        category_ids: [categoryIdByName.get(blueprint.category)!],
        type_id: typeIdByValue.get(blueprint.type)!,
        tag_ids: blueprint.tags.map((tag) => tagIdByValue.get(tag)!),
        description: blueprint.description,
        handle: blueprint.handle,
        weight: blueprint.weight,
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfile.id,
        metadata: {
          ...blueprint.specs,
          // Denormalised so the rating filter and the card stars read one
          // product row rather than aggregating reviews per listing.
          average_rating: blueprint.averageRating,
          review_count: blueprint.reviewCount,
        },
        options: blueprint.options.map((option) => ({
          title: option.title,
          values: option.values,
        })),
        variants: buildVariants(blueprint),
        sales_channels: [{ id: salesChannel.id }],
      })),
    },
  });

  logger.info(`Created ${blueprints.length} products.`);

  // ---- inventory ----
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  });

  const existingLevels = await query.graph({
    entity: "inventory_level",
    fields: ["inventory_item_id"],
  });

  const levelled = new Set(
    existingLevels.data.map((level: any) => level.inventory_item_id)
  );

  const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems
    .filter((item) => !levelled.has(item.id))
    .map((item) => ({
      location_id: stockLocation.id,
      inventory_item_id: item.id,
      stocked_quantity: STOCK_BY_SKU[item.sku ?? ""] ?? DEFAULT_STOCK,
    }));

  if (inventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    });
  }

  logger.info(`Stocked ${inventoryLevels.length} variants.`);
  logger.info("Catalogue seeded. Export it and generate the images next.");
}
