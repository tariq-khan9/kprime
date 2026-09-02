import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  batchLinkProductsToCollectionWorkflow,
  createCollectionsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Demo product collections, so /collections/[handle] has something to render.
 *
 * Run with: npx medusa exec ./src/scripts/add-demo-collections.ts
 *
 * DEMO DATA. Collections are merchandised sets — a human picks what goes in
 * one, which is exactly why they carry no faceted filters on the storefront.
 * These two are stand-ins until real merchandising happens; delete them in
 * Admin > Products > Collections when the real ones land.
 *
 * Idempotent: re-running skips any collection that already exists, and product
 * links are additive, so a second run cannot duplicate them.
 */

const DEMO_COLLECTIONS = [
  {
    title: "Sale",
    handle: "sale",
    products: [
      "45w-usb-c-wall-charger",
      "braided-usb-c-cable",
      "20000mah-fast-power-bank",
      "microfibre-pillow",
      "non-stick-frying-pan",
    ],
  },
  {
    title: "New Arrivals",
    handle: "new-arrivals",
    products: [
      "mechanical-keyboard-tkl",
      "silent-wireless-mouse",
      "wireless-noise-cancelling-earbuds",
      "oud-eau-de-parfum",
      "matte-liquid-lipstick",
    ],
  },
];

export default async function addDemoCollections({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve(Modules.PRODUCT);

  const existing = await productModule.listProductCollections(
    {},
    { select: ["id", "handle"] }
  );
  const byHandle = new Map(existing.map((c) => [c.handle, c.id]));

  const toCreate = DEMO_COLLECTIONS.filter((c) => !byHandle.has(c.handle));

  if (toCreate.length > 0) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: {
        collections: toCreate.map((collection) => ({
          title: collection.title,
          handle: collection.handle,
        })),
      },
    });

    for (const created of result) {
      byHandle.set(created.handle, created.id);
      logger.info(`Created collection: ${created.title} (/${created.handle})`);
    }
  } else {
    logger.info("All demo collections already exist.");
  }

  // Handles are resolved to ids once, rather than per collection — the
  // catalogue is demo data and a renamed product should warn, not abort a run
  // that has already created collections.
  const wanted = new Set(DEMO_COLLECTIONS.flatMap((c) => c.products));

  const products = await productModule.listProducts(
    { handle: Array.from(wanted) },
    { select: ["id", "handle"] }
  );
  const productIdByHandle = new Map(products.map((p) => [p.handle, p.id]));

  for (const collection of DEMO_COLLECTIONS) {
    const collectionId = byHandle.get(collection.handle);

    if (!collectionId) {
      logger.warn(`No id for collection ${collection.handle}. Skipping links.`);
      continue;
    }

    const add: string[] = [];

    for (const handle of collection.products) {
      const id = productIdByHandle.get(handle);

      if (id) {
        add.push(id);
      } else {
        logger.warn(`Product not found, skipping: ${handle}`);
      }
    }

    if (add.length === 0) {
      logger.warn(`Nothing to link into ${collection.title}.`);
      continue;
    }

    // Linking is idempotent on Medusa's side, so this is safe to re-run and
    // also repairs a collection whose products were removed by hand.
    await batchLinkProductsToCollectionWorkflow(container).run({
      input: { id: collectionId, add },
    });

    logger.info(`Linked ${add.length} products into ${collection.title}.`);
  }

  logger.info(
    "Done. The storefront caches collections, so restart it to see them."
  );
}
