import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createPriceListsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Puts the Sale collection's products genuinely on sale.
 *
 * Run with: npx medusa exec ./src/scripts/seed-sale-prices.ts
 *
 * DEMO DATA. Delete in Admin > Pricing > Price Lists when real merchandising
 * lands.
 *
 * A price list of type "sale" is what makes a discount visible: Medusa then
 * returns `calculated_amount` at the sale price and `original_amount` at the
 * base price, which is the pair the storefront reads into `price` and
 * `originalPrice`. Simply lowering a variant's own price would look cheaper but
 * show no strikethrough and no percentage — there would be nothing to compare
 * against.
 *
 * Amounts are whole rupees. Medusa stores PKR unscaled, the same convention
 * seed-promotions.ts documents.
 */

const CURRENCY = "pkr";

const TITLE = "Demo sale";

// Varied on purpose. A single discount depth across every card makes the badge
// look like a template rather than a price.
const SALE_PRICES: { handle: string; amount: number }[] = [
  { handle: "braided-usb-c-cable", amount: 560 }, // 800 → −30%
  { handle: "45w-usb-c-wall-charger", amount: 1650 }, // 2200 → −25%
  { handle: "20000mah-fast-power-bank", amount: 2925 }, // 4500 → −35%
  { handle: "non-stick-frying-pan", amount: 3230 }, // 3800 → −15%
  { handle: "microfibre-pillow", amount: 1710 }, // 1900 → −10%
];

export default async function seedSalePrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve(Modules.PRODUCT);
  const pricingModule = container.resolve(Modules.PRICING);

  // Two overlapping sale lists would make it unpredictable which price wins, so
  // this refuses to stack a second one rather than trying to merge them.
  // `title` is not in Medusa's FilterablePriceListProps, but the module does
  // filter on it — verified against the live database. Cast rather than list
  // every price list and filter in memory.
  const existing = await pricingModule.listPriceLists(
    { title: [TITLE] } as any,
    { select: ["id"] }
  );

  if (existing.length > 0) {
    logger.info(
      `A price list titled "${TITLE}" already exists. Delete it in Admin > ` +
        `Pricing > Price Lists to re-seed. Nothing to do.`
    );
    return;
  }

  const products = await productModule.listProducts(
    { handle: SALE_PRICES.map((p) => p.handle) },
    { select: ["id", "handle"], relations: ["variants"] }
  );

  const byHandle = new Map(products.map((p) => [p.handle, p]));

  // Every variant of a product shares one price in this catalogue, so the sale
  // amount is written to all of them. Priced per variant because that is the
  // only level Medusa prices at — there is no product-level price to set.
  const prices: {
    currency_code: string;
    amount: number;
    variant_id: string;
  }[] = [];

  for (const { handle, amount } of SALE_PRICES) {
    const product = byHandle.get(handle);

    if (!product) {
      logger.warn(`Product not found, skipping: ${handle}`);
      continue;
    }

    const variants = product.variants ?? [];

    if (variants.length === 0) {
      logger.warn(`No variants on ${handle}, skipping.`);
      continue;
    }

    for (const variant of variants) {
      prices.push({
        currency_code: CURRENCY,
        amount,
        variant_id: variant.id,
      });
    }

    logger.info(
      `${product.handle}: Rs ${amount} across ${variants.length} variants`
    );
  }

  if (prices.length === 0) {
    logger.warn("No prices to write. Nothing created.");
    return;
  }

  await createPriceListsWorkflow(container).run({
    input: {
      // `type` is absent from CreatePriceListWorkflowInputDTO but is what makes
      // this a sale list rather than an override — confirmed by the resulting
      // compare-at prices on the storefront. Cast so the intent survives.
      price_lists_data: [
        {
          title: TITLE,
          description: "Demo discounts for the home page Sale rail.",
          // "sale" is what produces a compare-at price. "override" would
          // silently replace the price with no discount shown.
          type: "sale",
          // A draft list is created but never applied, so the storefront would
          // show no change at all.
          status: "active",
          prices,
        },
      ] as any,
    },
  });

  logger.info(
    `Created "${TITLE}" with ${prices.length} prices. The storefront caches ` +
      `products, so restart it to see them.`
  );
}
