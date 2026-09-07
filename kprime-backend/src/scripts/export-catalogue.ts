import fs from "node:fs";
import path from "node:path";

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { buildCatalogue } from "../data/catalogue";

/**
 * Writes the composed catalogue to `static/catalogue.json`.
 *
 * Run with: npx medusa exec ./src/scripts/export-catalogue.ts
 *
 * **This exists so the image generator cannot drift from the database.**
 * `tools/generate-placeholders.py` draws each product's own filterable
 * attributes onto its placeholder image — that is the entire point of the demo
 * catalogue, because it is what lets you confirm a filter worked by looking at
 * the grid. If Python recomposed the product list itself, the two definitions
 * would diverge the first time either changed, and every image would quietly
 * start describing the wrong product.
 *
 * Reads nothing from the database on purpose: the JSON must match what
 * `seed.ts` is about to write, so both read the same module.
 */
export default async function exportCatalogue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const products = buildCatalogue();

  const out = path.join(process.cwd(), "static", "catalogue.json");

  fs.mkdirSync(path.dirname(out), { recursive: true });

  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        generatedBy: "src/scripts/export-catalogue.ts",
        count: products.length,
        products: products.map((product) => ({
          handle: product.handle,
          title: product.title,
          category: product.category,
          topCategory: product.topCategory,
          type: product.type,
          price: product.price,
          tags: product.tags,
          averageRating: product.averageRating,
          reviewCount: product.reviewCount,
          // The whole reason the file exists — one row per filterable axis.
          options: product.options,
        })),
      },
      null,
      2
    ),
    "utf8"
  );

  logger.info(`Wrote ${products.length} products to static/catalogue.json`);
}
