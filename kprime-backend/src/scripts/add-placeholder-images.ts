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
 * Six images per product at deliberately mixed aspect ratios — portrait,
 * landscape, square, tall and wide. A uniform set would hide exactly the bug
 * the gallery has to survive: a source image that is not the display ratio must
 * composite without distortion, and only a real circle in the artwork makes
 * stretching visible.
 *
 * URLs are absolute and baked in at write time, pointing at MEDUSA_BACKEND_URL.
 * Moving the backend to another host means re-running this.
 */

const IMAGES_PER_PRODUCT = 6;

const BASE = `${
  process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
}/static/placeholder`;

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
    const wanted = Array.from(
      { length: IMAGES_PER_PRODUCT },
      (_, i) => `${BASE}/${product.handle}-${i + 1}.png`
    );

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

  logger.info(
    `Updated ${updates.length} products with ${IMAGES_PER_PRODUCT} images each. ` +
      `The storefront caches products, so restart it to see them.`
  );
}
