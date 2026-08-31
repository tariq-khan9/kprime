import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Task 6 — one Standard and one Express option per zone, Standard only on Remote.
 *
 * Run with: npx medusa exec ./src/scripts/setup-shipping-options.ts
 *
 * Task 5 deleted the seeded country-wide zone, and its two shipping options went
 * with it — they were foreign-keyed to it. Until this runs the store has no
 * shipping at all and no cart can complete.
 *
 * Creates only what is missing and never updates an option that already exists,
 * so re-running this cannot overwrite a rate edited in admin. Prices are yours to
 * change there; this script only guarantees the seven exist.
 */

/**
 * Flat rates, whole rupees — PKR is zero-decimal, so 250 is Rs 250.
 *
 * These are the seed's national flat rates carried across every zone rather than
 * numbers invented here. They make the four tiers price-identical for now: the
 * zones differentiate by delivery window only, until the real TCS/Leopards sheet
 * lands and the per-zone prices are set in admin.
 */
const STANDARD_RATE = 250;
const EXPRESS_RATE = 600;

/**
 * The window belongs in the NAME, not a description. Task 89's DeliveryEstimateBox,
 * the checkout shipping step and the confirmation page all read their delivery
 * copy off this string, so it is a public promise — deliberately conservative,
 * with room for the manual verification call before dispatch.
 */
type OptionSpec = { code: "standard" | "express"; name: string; amount: number };

const OPTIONS_BY_ZONE: Record<string, OptionSpec[]> = {
  Local: [
    { code: "standard", name: "Standard Delivery (1–2 days)", amount: STANDARD_RATE },
    { code: "express", name: "Express Delivery (next day)", amount: EXPRESS_RATE },
  ],
  Metro: [
    { code: "standard", name: "Standard Delivery (2–4 days)", amount: STANDARD_RATE },
    { code: "express", name: "Express Delivery (1–2 days)", amount: EXPRESS_RATE },
  ],
  "Other cities": [
    { code: "standard", name: "Standard Delivery (3–5 days)", amount: STANDARD_RATE },
    { code: "express", name: "Express Delivery (2–3 days)", amount: EXPRESS_RATE },
  ],
  // No Express on Remote — the couriers surcharge these destinations and do not
  // commit to an expedited window for them.
  Remote: [
    { code: "standard", name: "Standard Delivery (5–8 days)", amount: STANDARD_RATE },
  ],
};

export default async function setupShippingOptions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const fulfillment = container.resolve(Modules.FULFILLMENT);
  const region = container.resolve(Modules.REGION);

  const [profile] = await fulfillment.listShippingProfiles({ type: "default" });

  if (!profile) {
    throw new Error("No default shipping profile. Run `pnpm seed` first.");
  }

  const [pakistan] = await region.listRegions({ currency_code: "pkr" });

  if (!pakistan) {
    throw new Error("No PKR region found. Run `pnpm seed` first.");
  }

  // Reuse the types the seed created. Passing an inline `type` object instead
  // would mint a new shipping option type per option and leave seven
  // near-duplicates in Settings > Shipping Option Types.
  const types = await fulfillment.listShippingOptionTypes({});
  const typeIdByCode = new Map(types.map((t) => [t.code, t.id]));

  const zones = await fulfillment.listServiceZones({});
  const zoneByName = new Map(zones.map((z) => [z.name, z]));

  let created = 0;
  let skipped = 0;

  for (const [zoneName, specs] of Object.entries(OPTIONS_BY_ZONE)) {
    const zone = zoneByName.get(zoneName);

    if (!zone) {
      throw new Error(
        `Service zone "${zoneName}" is missing. Run setup-shipping-zones.ts (task 5) first.`
      );
    }

    const existing = await fulfillment.listShippingOptions({
      service_zone: { id: zone.id },
    });
    const existingNames = new Set(existing.map((o) => o.name));

    for (const spec of specs) {
      if (existingNames.has(spec.name)) {
        logger.info(`Exists, left alone: ${zoneName} / ${spec.name}`);
        skipped++;
        continue;
      }

      const type_id = typeIdByCode.get(spec.code);

      if (!type_id) {
        throw new Error(`No shipping option type with code "${spec.code}".`);
      }

      await createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: spec.name,
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: zone.id,
            shipping_profile_id: profile.id,
            type_id,
            prices: [
              { currency_code: "pkr", amount: spec.amount },
              { region_id: pakistan.id, amount: spec.amount },
            ],
            rules: [
              // Not optional. Without this the option exists and shows in admin
              // but never reaches the storefront — indistinguishable from a geo
              // zone mismatch, and miserable to debug.
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
        ],
      });

      logger.info(`Created: ${zoneName} / ${spec.name} — Rs ${spec.amount}`);
      created++;
    }
  }

  logger.info(`Done. ${created} created, ${skipped} already present.`);
  logger.info(
    "Rates are placeholders — edit them per zone in Admin > Settings > Locations. " +
      "Re-running this script will not overwrite them."
  );
}
