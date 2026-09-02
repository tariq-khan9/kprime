import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Sets a variant's stocked quantity, by SKU.
 *
 *   SKU=KBD-BLUE-BLACK QTY=0 npx medusa exec ./src/scripts/set-variant-stock.ts
 *
 * A test fixture, not seed data. Cart edge cases (task 101) only occur when
 * stock drops *after* an item is already in a cart — Medusa refuses to add a
 * variant it cannot fulfil — so there is no way to reproduce them without
 * moving inventory behind an existing cart.
 *
 * Prints the previous quantity so it can be put back.
 */

export default async function setVariantStock({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const inventoryModule = container.resolve(Modules.INVENTORY);

  const sku = process.env.SKU;
  const qty = Number(process.env.QTY);

  if (!sku || Number.isNaN(qty)) {
    logger.error("Usage: SKU=<sku> QTY=<number> npx medusa exec ...");
    return;
  }

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "inventory_items.inventory_item_id"],
    filters: { sku },
  });

  const variant = variants[0];

  if (!variant) {
    logger.error(`No variant with sku ${sku}.`);
    return;
  }

  const itemId = variant.inventory_items?.[0]?.inventory_item_id;

  if (!itemId) {
    logger.error(`Variant ${sku} has no inventory item.`);
    return;
  }

  const levels = await inventoryModule.listInventoryLevels({
    inventory_item_id: itemId,
  });

  const level = levels[0];

  if (!level) {
    logger.error(`No inventory level for ${sku}.`);
    return;
  }

  logger.info(`${sku}: stocked_quantity ${level.stocked_quantity} -> ${qty}`);

  await updateInventoryLevelsWorkflow(container).run({
    input: {
      updates: [
        {
          inventory_item_id: itemId,
          location_id: level.location_id,
          stocked_quantity: qty,
        },
      ],
    },
  });

  logger.info("Done.");
}
