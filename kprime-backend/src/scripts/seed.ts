import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createProductTagsWorkflow,
  createProductTypesWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
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
 * KPrime seeds a single-region Pakistani store: PKR, country PK, Cash on
 * Delivery through Medusa's built-in system payment provider.
 */
const CURRENCY = "pkr";

type SeedApiKey = { id: string; token?: string };

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

/**
 * KPrime is a mixed general store: electronics (the flagship), cosmetics,
 * kitchenware and home bedding.
 *
 * Categories carry genuinely different attributes — a charger has wattage and a
 * warranty, a bedsheet has a thread count and a bed size, a lipstick has a shade
 * and nothing else. So variant options and specs are declared per product rather
 * than as one global size x colour matrix.
 *
 * Seeded products deliberately carry NO images. The only public bucket available
 * holds apparel photos, which would be actively misleading on a power bank; the
 * storefront renders a placeholder for image-less products, and real photography
 * is uploaded through the admin.
 */

/** Top-level category -> its children. Parents are seeded first. */

/**
 * Variants are the cartesian product of whatever options the product declares —
 * one axis for a lipstick shade, two for a bedsheet's size and colour.
 */
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
      prices: [
        {
          amount: product.price,
          currency_code: CURRENCY,
        },
      ],
    };
  });
};


/**
 * The catalogue is composed in `src/data/catalogue.ts` rather than written out
 * here: 159 products cannot be hand-maintained, and the placeholder image
 * generator has to read exactly the same definitions or every image in the shop
 * would describe a product that does not match it.
 */
const productBlueprints: ProductBlueprint[] = buildCatalogue();

const DEFAULT_STOCK = 40;
/**
 * A few deliberate stock states so the storefront's out-of-stock and low-stock
 * paths are exercised by the seed rather than only in production.
 */
const STOCK_BY_SKU: Record<string, number> = {
  // Out of stock — one variant of a multi-variant product, so the selector has
  // to disable a single choice rather than the whole product.
  "MOB001-5000MAH-WHITE": 0,
  "BED001-KING-BEIGE": 0,
  // The only variant there is, so the whole product reads unavailable.
  "AUD001-WIRELESS-INEAR": 0,
  // Low stock, spread across categories so every listing shows the badge.
  "CMP001-BLUE-TKL": 3,
  "MKP001-RUBY-MATTE": 4,
  "APP001-STEEL-17L": 6,
  "CKW001-28CM-NONSTICK": 7,
  "MOB010-2M-BLACK": 9,
  "BED001-QUEEN-WHITE": 12,
};

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const countries = ["pk"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: CURRENCY,
          is_default: true,
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Pakistan",
          currency_code: CURRENCY,
          countries,
          // Cash on Delivery — Medusa's built-in system provider.
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Karachi Warehouse",
          address: {
            city: "Karachi",
            country_code: "PK",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Pakistan delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Pakistan",
        geo_zones: countries.map((country_code) => ({
          country_code,
          type: "country" as const,
        })),
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Delivered in 3-5 working days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: CURRENCY,
            amount: 250,
          },
          {
            region_id: region.id,
            amount: 250,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Delivered in 1-2 working days.",
          code: "express",
        },
        prices: [
          {
            currency_code: CURRENCY,
            amount: 600,
          },
          {
            region_id: region.id,
            amount: 600,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: SeedApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "token"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as SeedApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product categories...");
  // Parents first — the children need their ids for parent_category_id.
  const { result: parentCategories } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: Object.keys(CATEGORY_TREE).map((name) => ({
        name,
        handle: slugify(name),
        is_active: true,
      })),
    },
  });

  const parentIdByName = new Map(parentCategories.map((cat) => [cat.name, cat.id]));

  const { result: childCategories } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      // Level 2 only. The leaves are created by seed-catalogue.ts, which owns
      // the catalogue and is the script that re-runs; creating them here too
      // would just be a second place to keep the tree in step.
      product_categories: Object.entries(CATEGORY_TREE).flatMap(
        ([parent, subs]) =>
          Object.keys(subs).map((name) => ({
            name,
            handle: slugify(name),
            is_active: true,
            parent_category_id: parentIdByName.get(parent)!,
          }))
      ),
    },
  });

  const categoryIdByName = new Map<string, string>(
    [...parentCategories, ...childCategories].map((cat) => [cat.name, cat.id])
  );
  logger.info(`Finished seeding ${categoryIdByName.size} product categories.`);

  logger.info("Seeding product tags and types...");
  // Tags and types are separate entities referenced by id, not inline values.
  const { result: createdTags } = await createProductTagsWorkflow(container).run({
    input: { product_tags: PRODUCT_TAGS.map((value) => ({ value })) },
  });
  const tagIdByValue = new Map(createdTags.map((tag) => [tag.value, tag.id]));

  const { result: createdTypes } = await createProductTypesWorkflow(
    container
  ).run({
    input: {
      product_types: [
        ...new Set(productBlueprints.map((blueprint) => blueprint.type)),
      ].map((value) => ({ value })),
    },
  });
  const typeIdByValue = new Map(
    createdTypes.map((type) => [type.value, type.id])
  );
  logger.info(
    `Finished seeding ${tagIdByValue.size} tags and ${typeIdByValue.size} types.`
  );

  logger.info("Seeding product data...");
  await createProductsWorkflow(container).run({
    input: {
      products: productBlueprints.map((blueprint) => ({
        title: blueprint.title,
        category_ids: [categoryIdByName.get(blueprint.category)!],
        type_id: typeIdByValue.get(blueprint.type)!,
        tag_ids: blueprint.tags.map((tag) => tagIdByValue.get(tag)!),
        description: blueprint.description,
        handle: blueprint.handle,
        weight: blueprint.weight,
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfile.id,
        // Per-category specs. Keys differ by category and are rendered as a
        // table on the product page.
        metadata: {
          ...blueprint.specs,
          // Denormalised so the rating filter and the card stars can read one
          // product row instead of aggregating reviews per listing.
          average_rating: blueprint.averageRating,
          review_count: blueprint.reviewCount,
        },
        options: blueprint.options.map((option) => ({
          title: option.title,
          values: option.values,
        })),
        variants: buildVariants(blueprint),
        sales_channels: [
          {
            id: defaultSalesChannel[0].id,
          },
        ],
      })),
    },
  });
  logger.info(`Finished seeding ${productBlueprints.length} products.`);

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems.map(
    (inventoryItem) => ({
      location_id: stockLocation.id,
      inventory_item_id: inventoryItem.id,
      stocked_quantity: STOCK_BY_SKU[inventoryItem.sku ?? ""] ?? DEFAULT_STOCK,
    })
  );

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");

  logger.info(
    `Publishable API key (set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY to this): ${publishableApiKey.token}`
  );
}
