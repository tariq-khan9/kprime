import fs from "node:fs";
import path from "node:path";

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Attaches the generated placeholder images to every product.
 *
 * Run with: npx medusa exec ./src/scripts/add-placeholder-images.ts
 *
 * DEMO DATA. The files live in `static/placeholder/` and are generated
 * separately; this only writes the database rows pointing at them. Replace both
 * when real photography lands in task 10.
 *
 * Between one and five images per product, at deliberately mixed aspect ratios
 * — portrait, landscape, square, tall and wide. A uniform set would hide
 * exactly the bug the gallery has to survive: a source image that is not the
 * display ratio must composite without distortion, and only a real circle in
 * the artwork makes stretching visible.
 *
 * The counts come from whatever files exist on disk rather than a constant
 * here, so the generator and this script cannot drift apart. Five is the
 * ceiling the storefront enforces in `MAX_PRODUCT_IMAGES`; one is the floor.
 *
 * URLs are absolute and baked in at write time, pointing at MEDUSA_BACKEND_URL.
 * Moving the backend to another host means re-running this.
 */

/** Matches MAX_PRODUCT_IMAGES in the storefront's products.ts. */
const MAX_IMAGES = 5;

const DIR = path.join(process.cwd(), "static", "placeholder");

const BASE = `${
  process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
}/static/placeholder`;

/** The generated files for one product, in order, capped at the ceiling. */
function filesFor(handle: string): string[] {
  const names: string[] = [];

  for (let i = 1; i <= MAX_IMAGES; i++) {
    const name = `${handle}-${i}.png`;

    // Stops at the first gap, so numbering stays contiguous from 1.
    if (!fs.existsSync(path.join(DIR, name))) {
      break;
    }

    names.push(name);
  }

  return names;
}

export default async function addPlaceholderImages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve(Modules.PRODUCT);

  const products = await productModule.listProducts(
    {},
    { select: ["id", "handle", "thumbnail"], relations: ["images"] }
  );

  if (products.length === 0) {
    logger.warn("No products found. Nothing to do.");
    return;
  }

  const updates: {
    id: string;
    thumbnail: string;
    images: { url: string }[];
  }[] = [];

  for (const product of products) {
    // Idempotent: a product that already carries these images is left alone, so
    // re-running does not stack duplicates.
    const existing = (product.images ?? []).map((image) => image.url);
    const wanted = filesFor(product.handle).map((name) => `${BASE}/${name}`);

    if (wanted.length === 0) {
      logger.warn(`No generated images for ${product.handle}. Skipping.`);
      continue;
    }

    const same =
      existing.length === wanted.length &&
      wanted.every((url, i) => existing[i] === url);

    if (same && product.thumbnail === wanted[0]) {
      continue;
    }

    updates.push({
      id: product.id,
      // The first image doubles as the card thumbnail, so a listing and the
      // detail page open on the same picture.
      thumbnail: wanted[0],
      images: wanted.map((url) => ({ url })),
    });
  }

  if (updates.length === 0) {
    logger.info("Every product already has its placeholder images.");
    return;
  }

  await updateProductsWorkflow(container).run({
    input: { products: updates },
  });

  for (const update of updates) {
    logger.info(`${update.id}: ${update.images.length} images`);
  }

  logger.info(
    `Updated ${updates.length} products. The storefront caches products, so ` +
      `restart it to see them.`
  );
}
