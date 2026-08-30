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
const CATEGORY_TREE: Record<string, string[]> = {
  Electronics: ["Mobile Accessories", "Audio", "Computer Accessories"],
  Cosmetics: ["Skincare", "Makeup", "Fragrances"],
  Kitchenware: ["Cookware", "Kitchen Appliances", "Storage & Containers"],
  "Home & Bedding": ["Bedsheets", "Pillows & Blankets"],
};

/** Cross-category tags — how a shopper filters across unrelated categories. */
const PRODUCT_TAGS = [
  "Imported",
  "Bestseller",
  "New Arrival",
  "Warranty Included",
];

type VariantOption = {
  /** Option name shown on the product page, e.g. "Capacity" or "Bed Size". */
  title: string;
  values: string[];
};

type ProductBlueprint = {
  title: string;
  handle: string;
  description: string;
  /** Leaf category name from CATEGORY_TREE. */
  category: string;
  /** Coarser grouping than category, used for filtering. */
  type: string;
  tags: string[];
  weight: number;
  /** Prefix for generated variant SKUs. */
  skuBase: string;
  /** Variant price in whole rupees — PKR has no minor unit. */
  price: number;
  /** Variant axes. Variants are the cartesian product of these. */
  options: VariantOption[];
  /** Category-specific specs, rendered as a table on the product page. */
  specs: Record<string, string>;
};

const skuPart = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Explicit category handles. Medusa's auto-slug keeps "&" verbatim, so
 * "Home & Bedding" becomes the handle "home-&-bedding" and lands an ampersand in
 * the URL path. Spell "and" out instead.
 */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

const productBlueprints: ProductBlueprint[] = [
  // ---------- Electronics (flagship category) ----------
  {
    title: "20000mAh Fast Power Bank",
    handle: "20000mah-fast-power-bank",
    description:
      "Enough charge to take a phone through three full days, or a load-shedding evening with the router still running. Charges two devices at once.",
    category: "Mobile Accessories",
    type: "Power & Charging",
    tags: ["Imported", "Bestseller", "Warranty Included"],
    weight: 420,
    skuBase: "PWRBNK",
    price: 4500,
    options: [{ title: "Colour", values: ["Black", "White"] }],
    specs: {
      Capacity: "20000 mAh",
      "Max Output": "22.5W",
      Ports: "2x USB-A, 1x USB-C",
      Warranty: "6 months",
    },
  },
  {
    title: "45W USB-C Wall Charger",
    handle: "45w-usb-c-wall-charger",
    description:
      "Compact GaN charger that fills a modern phone to half in about twenty minutes. Fits a standard Pakistani wall socket without an adapter.",
    category: "Mobile Accessories",
    type: "Power & Charging",
    tags: ["Imported", "Warranty Included"],
    weight: 95,
    skuBase: "CHRG",
    price: 2200,
    options: [
      { title: "Wattage", values: ["25W", "45W"] },
      { title: "Colour", values: ["White"] },
    ],
    specs: {
      Input: "100-240V",
      Technology: "GaN",
      "Cable Included": "No",
      Warranty: "12 months",
    },
  },
  {
    title: "Braided USB-C Cable",
    handle: "braided-usb-c-cable",
    description:
      "Nylon-braided and rated for 10,000 bends, because the cheap ones always fray at the connector first.",
    category: "Mobile Accessories",
    type: "Power & Charging",
    tags: ["Bestseller"],
    weight: 60,
    skuBase: "CABLE",
    price: 800,
    options: [
      { title: "Length", values: ["1m", "2m"] },
      { title: "Colour", values: ["Black", "Grey"] },
    ],
    specs: {
      Connector: "USB-C to USB-C",
      "Data Rate": "480 Mbps",
      "Power Rating": "60W",
    },
  },
  {
    title: "Wireless Noise-Cancelling Earbuds",
    handle: "wireless-noise-cancelling-earbuds",
    description:
      "Active noise cancellation that actually holds up against traffic and a ceiling fan. Case gives roughly four extra charges.",
    category: "Audio",
    type: "Audio",
    tags: ["Imported", "New Arrival", "Warranty Included"],
    weight: 55,
    skuBase: "BUDS",
    price: 6500,
    options: [{ title: "Colour", values: ["Black", "White"] }],
    specs: {
      "Battery Life": "6h (28h with case)",
      Bluetooth: "5.3",
      "Driver Size": "11mm",
      "Water Resistance": "IPX4",
      Warranty: "12 months",
    },
  },
  {
    title: "Portable Bluetooth Speaker",
    handle: "portable-bluetooth-speaker",
    description:
      "Loud enough for a rooftop gathering, small enough for a backpack. Survives a splash but not a swim.",
    category: "Audio",
    type: "Audio",
    tags: ["Bestseller"],
    weight: 640,
    skuBase: "SPKR",
    price: 5200,
    options: [{ title: "Colour", values: ["Black", "Blue"] }],
    specs: {
      "Output Power": "20W",
      "Battery Life": "12 hours",
      "Water Resistance": "IPX6",
      Warranty: "6 months",
    },
  },
  {
    title: "Silent Wireless Mouse",
    handle: "silent-wireless-mouse",
    description:
      "Near-silent switches and a year on one AA battery. The receiver tucks into the base so it does not get lost.",
    category: "Computer Accessories",
    type: "Computer Peripherals",
    tags: ["Imported"],
    weight: 85,
    skuBase: "MOUSE",
    price: 1800,
    options: [{ title: "Colour", values: ["Black", "Grey"] }],
    specs: {
      Connection: "2.4GHz wireless",
      DPI: "1600",
      Battery: "1x AA (included)",
      Warranty: "6 months",
    },
  },
  {
    title: "Mechanical Keyboard TKL",
    handle: "mechanical-keyboard-tkl",
    description:
      "Tenkeyless layout that frees up desk space for the mouse. Hot-swappable switches, so a change of mind costs nothing.",
    category: "Computer Accessories",
    type: "Computer Peripherals",
    tags: ["Imported", "New Arrival", "Warranty Included"],
    weight: 780,
    skuBase: "KBD",
    price: 8900,
    options: [
      { title: "Switch Type", values: ["Blue", "Red", "Brown"] },
      { title: "Colour", values: ["Black", "White"] },
    ],
    specs: {
      Layout: "87-key TKL",
      Switches: "Hot-swappable",
      Backlight: "RGB",
      Connection: "USB-C detachable",
      Warranty: "12 months",
    },
  },

  // ---------- Cosmetics ----------
  {
    title: "Vitamin C Brightening Serum",
    handle: "vitamin-c-brightening-serum",
    description:
      "A 10% vitamin C serum for dullness and uneven tone. Use it at night and follow with sunscreen the next morning.",
    category: "Skincare",
    type: "Skincare",
    tags: ["Imported", "Bestseller"],
    weight: 120,
    skuBase: "SERUM",
    price: 3200,
    options: [{ title: "Size", values: ["30ml", "50ml"] }],
    specs: {
      "Key Ingredient": "10% Vitamin C",
      "Skin Type": "All, including sensitive",
      Usage: "Night",
      "Shelf Life": "12 months after opening",
    },
  },
  {
    title: "Matte Liquid Lipstick",
    handle: "matte-liquid-lipstick",
    description:
      "Transfer-resistant matte finish that lasts through a meal. Three shades chosen to suit South Asian skin tones.",
    category: "Makeup",
    type: "Makeup",
    tags: ["Bestseller", "New Arrival"],
    weight: 35,
    skuBase: "LIP",
    price: 1500,
    options: [{ title: "Shade", values: ["Ruby", "Nude", "Plum"] }],
    specs: {
      Finish: "Matte",
      "Net Weight": "5ml",
      "Wear Time": "8 hours",
      "Cruelty Free": "Yes",
    },
  },
  {
    title: "Oud Eau de Parfum",
    handle: "oud-eau-de-parfum",
    description:
      "Warm oud over rose and amber. Heavy enough for winter evenings and weddings, too much for a summer afternoon.",
    category: "Fragrances",
    type: "Fragrance",
    tags: ["Imported"],
    weight: 320,
    skuBase: "OUD",
    price: 7500,
    options: [{ title: "Size", values: ["50ml", "100ml"] }],
    specs: {
      Concentration: "Eau de Parfum",
      "Top Notes": "Rose, Saffron",
      "Base Notes": "Oud, Amber, Musk",
      Longevity: "8-10 hours",
    },
  },

  // ---------- Kitchenware ----------
  {
    title: "Non-Stick Frying Pan",
    handle: "non-stick-frying-pan",
    description:
      "Heavy forged base that spreads heat evenly instead of scorching one spot. Works on gas and induction.",
    category: "Cookware",
    type: "Cookware",
    tags: ["Bestseller"],
    weight: 1100,
    skuBase: "PAN",
    price: 3800,
    options: [{ title: "Size", values: ["24cm", "28cm"] }],
    specs: {
      Material: "Forged aluminium",
      Coating: "PFOA-free non-stick",
      "Induction Safe": "Yes",
      "Dishwasher Safe": "No — hand wash",
    },
  },
  {
    title: "1.7L Electric Kettle",
    handle: "1-7l-electric-kettle",
    description:
      "Boils a full jug in about four minutes and shuts itself off. Stainless interior, so no plastic taste.",
    category: "Kitchen Appliances",
    type: "Small Appliances",
    tags: ["Warranty Included"],
    weight: 950,
    skuBase: "KETTLE",
    price: 4200,
    options: [{ title: "Colour", values: ["Steel", "Black"] }],
    specs: {
      Capacity: "1.7 L",
      Power: "2200W",
      Interior: "Stainless steel",
      "Auto Shut-Off": "Yes",
      Warranty: "12 months",
    },
  },
  {
    title: "Airtight Storage Container Set",
    handle: "airtight-storage-container-set",
    description:
      "Locking lids that actually keep atta and daal dry through humid months. Stackable, so they fit a shallow shelf.",
    category: "Storage & Containers",
    type: "Kitchen Storage",
    tags: ["New Arrival"],
    weight: 1400,
    skuBase: "CNTR",
    price: 2600,
    options: [{ title: "Set Size", values: ["3-piece", "5-piece"] }],
    specs: {
      Material: "BPA-free plastic",
      Seal: "Silicone gasket",
      "Dishwasher Safe": "Yes",
      Stackable: "Yes",
    },
  },

  // ---------- Home & Bedding ----------
  {
    title: "Cotton Bedsheet Set",
    handle: "cotton-bedsheet-set",
    description:
      "Pure cotton that gets softer with washing rather than pilling. Comes with two pillowcases; king adds a third.",
    category: "Bedsheets",
    type: "Bed Linen",
    tags: ["Bestseller"],
    weight: 1600,
    skuBase: "BEDSHT",
    price: 5500,
    options: [
      { title: "Bed Size", values: ["Single", "Double", "King"] },
      { title: "Colour", values: ["White", "Grey", "Navy"] },
    ],
    specs: {
      Material: "100% cotton",
      "Thread Count": "300",
      Pieces: "Sheet + 2 pillowcases",
      Care: "Machine wash cold",
    },
  },
  {
    title: "Microfibre Pillow",
    handle: "microfibre-pillow",
    description:
      "Medium loft that holds its shape instead of flattening after a month. Hypoallergenic fill.",
    category: "Pillows & Blankets",
    type: "Bed Linen",
    tags: ["New Arrival"],
    weight: 900,
    skuBase: "PILLOW",
    price: 1900,
    options: [{ title: "Pack", values: ["Single", "Pack of 2"] }],
    specs: {
      Fill: "Hypoallergenic microfibre",
      Dimensions: "18 x 28 in",
      Loft: "Medium",
      Care: "Spot clean",
    },
  },
];

const DEFAULT_STOCK = 40;
/**
 * A few deliberate stock states so the storefront's out-of-stock and low-stock
 * paths are exercised by the seed rather than only in production.
 */
const STOCK_BY_SKU: Record<string, number> = {
  "PWRBNK-WHITE": 0,
  "BEDSHT-KING-NAVY": 0,
  "BUDS-BLACK": 3,
  "KBD-BLUE-BLACK": 4,
  "LIP-RUBY": 6,
  "KETTLE-STEEL": 7,
  "PAN-28CM": 9,
  "CABLE-2M-BLACK": 12,
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
      product_categories: Object.entries(CATEGORY_TREE).flatMap(
        ([parent, children]) =>
          children.map((name) => ({
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
        metadata: blueprint.specs,
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
