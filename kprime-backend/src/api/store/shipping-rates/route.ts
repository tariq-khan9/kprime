import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Delivery charges, for the Shipping & Delivery page.
 *
 *   GET /store/shipping-rates
 *
 * The core /store/shipping-options endpoint requires a cart, which a content
 * page does not have. Rates are set by the shop owner in the admin dashboard, so
 * this reads them live rather than letting the page carry numbers that quietly
 * go stale the first time someone edits a shipping option.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "prices.amount", "prices.currency_code"],
  });

  const currency = (
    typeof req.query.currency_code === "string"
      ? req.query.currency_code
      : "pkr"
  ).toLowerCase();

  const rates = (options ?? [])
    .map((option: any) => {
      const price = (option.prices ?? [])
        .filter(Boolean)
        .find((p: any) => p.currency_code?.toLowerCase() === currency);

      return price
        ? {
            id: option.id,
            name: option.name,
            amount: price.amount,
            currency_code: price.currency_code,
          }
        : null;
    })
    .filter(Boolean)
    // Cheapest first, so the page reads Standard then Express without the page
    // needing to know which is which.
    .sort((a: any, b: any) => Number(a.amount) - Number(b.amount));

  return res.json({ rates });
}
