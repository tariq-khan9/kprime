import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Seeds the store's discount codes.
 *
 *   npm run seed:promotions
 *
 * Separate from `seed.ts` on purpose: that script rebuilds the whole catalogue,
 * which is far too heavy to re-run every time a promotion needs resetting.
 * Re-running this one is safe — existing codes are left alone, not duplicated.
 *
 * Amounts are whole rupees. Medusa stores PKR unscaled (a 250 price is Rs 250),
 * so thresholds here read the same as they do on the storefront.
 */

const CURRENCY = "pkr";

// Minimum-spend thresholds are compared against the cart's `item_total`, which
// excludes shipping — a buyer cannot reach a discount threshold by upgrading to
// express delivery.
const MIN_SPEND = "item_total";

type Seedable = {
  code: string;
  description: string;
  build: () => any;
};

const promotions: Seedable[] = [
  {
    code: "SAVE10",
    description: "10% off the whole basket, no minimum",
    build: () => ({
      code: "SAVE10",
      type: "standard",
      status: "active",
      is_automatic: false,
      application_method: {
        type: "percentage",
        target_type: "items",
        allocation: "across",
        value: 10,
        currency_code: CURRENCY,
      },
    }),
  },
  {
    code: "FLAT500",
    description: "Rs 500 off orders of Rs 2,500 or more",
    build: () => ({
      code: "FLAT500",
      type: "standard",
      status: "active",
      is_automatic: false,
      application_method: {
        type: "fixed",
        target_type: "items",
        allocation: "across",
        value: 500,
        currency_code: CURRENCY,
      },
      rules: [{ attribute: MIN_SPEND, operator: "gte", values: ["2500"] }],
    }),
  },
  {
    code: "FREESHIP3000",
    description: "Free delivery on orders of Rs 3,000 or more",
    build: () => ({
      code: "FREESHIP3000",
      type: "standard",
      status: "active",
      is_automatic: false,
      // 100% off the shipping method rather than a fixed Rs 250, so it stays
      // correct if express (Rs 600) is chosen or shipping prices ever change.
      application_method: {
        type: "percentage",
        target_type: "shipping_methods",
        allocation: "across",
        value: 100,
        currency_code: CURRENCY,
      },
      rules: [{ attribute: MIN_SPEND, operator: "gte", values: ["3000"] }],
    }),
  },
  {
    code: "EXPIRED10",
    description: "Deliberately expired — fixture for the rejection path",
    build: () => ({
      code: "EXPIRED10",
      type: "standard",
      status: "active",
      is_automatic: false,
      application_method: {
        type: "percentage",
        target_type: "items",
        allocation: "across",
        value: 10,
        currency_code: CURRENCY,
      },
      // Expiry lives on the campaign, not the promotion. The module filters on
      // starts_at/ends_at when resolving a code, so this one can never apply.
      campaign: {
        name: "Expired test campaign",
        campaign_identifier: "expired-test",
        starts_at: new Date("2020-01-01"),
        ends_at: new Date("2020-12-31"),
      },
    }),
  },
];

export default async function seedPromotions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const promotionModuleService = container.resolve(Modules.PROMOTION);

  const existing = await promotionModuleService.listPromotions(
    { code: promotions.map((p) => p.code) },
    { select: ["code"] }
  );
  const existingCodes = new Set(existing.map((p) => p.code));

  const toCreate = promotions.filter((p) => !existingCodes.has(p.code));

  for (const code of existingCodes) {
    logger.info(`Promotion ${code} already exists, leaving it alone.`);
  }

  if (!toCreate.length) {
    logger.info("Nothing to seed.");
    return;
  }

  await createPromotionsWorkflow(container).run({
    input: { promotionsData: toCreate.map((p) => p.build()) },
  });

  for (const promotion of toCreate) {
    logger.info(`Created ${promotion.code} — ${promotion.description}`);
  }
}
