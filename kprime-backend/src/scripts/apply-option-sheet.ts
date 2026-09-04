import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  updateProductOptionsWorkflow,
  updateProductOptionValuesWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Brings the catalogue in line with OPTION-SHEET.md (task 8).
 *
 * The sheet is the frozen reference; this is the one-off that makes the existing
 * seed data match it.
 *
 * **The bug being fixed is real and live.** Three categories all named an option
 * `Size`, so the storefront's derived filter sidebar put millilitres and
 * centimetres in one group: `50ml · 100ml · 24cm · 28cm · 30ml`. It is invisible
 * today only because the group sits under the 25% coverage threshold.
 *
 * Titles are renamed first and values second, because renaming a value rewrites
 * a string that variants reference. Each product is verified afterwards — a
 * variant that lost its option link would be unbuyable, which is far worse than
 * a badly named filter.
 *
 * Idempotent: a product already matching the sheet is skipped.
 */

type Rename = {
  handle: string;
  from: string;
  to: string;
  /** Old value -> new value. Omit to leave values alone. */
  values?: Record<string, string>;
};

const RENAMES: Rename[] = [
  // `Size` meant centimetres here and millilitres elsewhere.
  { handle: "non-stick-frying-pan", from: "Size", to: "Diameter" },
  { handle: "oud-eau-de-parfum", from: "Size", to: "Volume" },
  { handle: "vitamin-c-brightening-serum", from: "Size", to: "Volume" },
  // One concept, two titles and two value formats.
  {
    handle: "airtight-storage-container-set",
    from: "Set Size",
    to: "Pack Size",
    values: { "3-piece": "Pack of 3", "5-piece": "Pack of 5" },
  },
  { handle: "microfibre-pillow", from: "Pack", to: "Pack Size" },
];

export default async function applyOptionSheet({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve(Modules.PRODUCT);

  for (const rename of RENAMES) {
    const [product] = await productModule.listProducts(
      { handle: rename.handle },
      { select: ["id", "title"], relations: ["options", "options.values"] }
    );

    if (!product) {
      logger.warn(`No product ${rename.handle}. Skipping.`);
      continue;
    }

    const option = (product.options ?? []).find(
      (o: any) => o.title === rename.from
    );

    if (!option) {
      const already = (product.options ?? []).some(
        (o: any) => o.title === rename.to
      );

      logger.info(
        already
          ? `${rename.handle}: already "${rename.to}". Nothing to do.`
          : `${rename.handle}: no option "${rename.from}". Skipping.`
      );
      continue;
    }

    await updateProductOptionsWorkflow(container).run({
      input: {
        selector: { id: option.id },
        update: { title: rename.to },
      },
    });

    logger.info(`${rename.handle}: "${rename.from}" -> "${rename.to}"`);

    for (const [from, to] of Object.entries(rename.values ?? {})) {
      const value = (option.values ?? []).find((v: any) => v.value === from);

      if (!value) {
        continue;
      }

      await updateProductOptionValuesWorkflow(container).run({
        input: {
          selector: { id: value.id },
          update: { value: to },
        },
      });

      logger.info(`   value "${from}" -> "${to}"`);
    }
  }

  // Verified rather than assumed: a rename that orphaned a variant's option link
  // would leave the product unbuyable, and the selector would silently disable
  // every choice.
  logger.info("--- verification ---");

  for (const rename of RENAMES) {
    const [product] = await productModule.listProducts(
      { handle: rename.handle },
      {
        select: ["id", "title"],
        relations: ["options", "options.values", "variants", "variants.options"],
      }
    );

    if (!product) {
      continue;
    }

    const titles = (product.options ?? []).map((o: any) => o.title);
    const variants = product.variants ?? [];
    const linked = variants.filter(
      (v: any) => (v.options ?? []).length > 0
    ).length;

    logger.info(
      `${rename.handle}: options=[${titles.join(", ")}] variants=${
        variants.length
      } with-option-links=${linked}${
        linked === variants.length ? "" : "  *** BROKEN ***"
      }`
    );
  }
}
