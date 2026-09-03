import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createOrderFulfillmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Fulfils an order and marks it delivered.
 *
 *   ORDER=138 CARRIER=TCS TRACKING=TCS123456789 \
 *     npx medusa exec ./src/scripts/mark-order-delivered.ts
 *
 * A development fixture. Reviews require a *delivered* order (§2.4), and
 * `/track`'s carrier block only renders when a fulfilment carrying a tracking
 * number exists — neither state can be reached from the storefront, because
 * both are things the shop does by hand in admin after the rider reports back.
 *
 * CARRIER and TRACKING are optional; without them the order is delivered with
 * no courier label, which is the other case the timeline has to handle.
 */
export default async function markOrderDelivered({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const displayId = process.env.ORDER;
  const carrier = process.env.CARRIER;
  const tracking = process.env.TRACKING;

  if (!displayId) {
    logger.error("Usage: ORDER=<display_id> npx medusa exec ...");
    return;
  }

  const { data: matches } = await query.graph({
    entity: "order",
    fields: ["id"],
    filters: { display_id: String(displayId) },
  });

  const orderId = matches?.[0]?.id;

  if (!orderId) {
    logger.error(`No order with display_id ${displayId}.`);
    return;
  }

  // `items.detail.quantity`, not `items.quantity`. The line item's own
  // `quantity` is derived and comes back undefined unless `detail` is loaded
  // alongside it — the fulfilment workflow then rejects the input with
  // "Quantity to fulfill ... is required", which points at the item rather than
  // at the query that produced it.
  const { data: withItems } = await query.graph({
    entity: "order",
    fields: ["id", "items.id", "items.quantity", "items.detail.quantity"],
    filters: { id: orderId },
  });

  const { data: withFulfillments } = await query.graph({
    entity: "order",
    fields: ["id", "fulfillments.id"],
    filters: { id: orderId },
  });

  const order = withItems[0];

  if ((withFulfillments[0]?.fulfillments ?? []).filter(Boolean).length > 0) {
    logger.info(`Order ${displayId} already has a fulfilment. Nothing to do.`);
    return;
  }

  const fulfillItems = (order.items ?? []).map((item: any) => ({
    id: item.id,
    quantity: item.quantity ?? item.detail?.quantity,
  }));

  const { result: fulfillment } = await createOrderFulfillmentWorkflow(
    container
  ).run({
    input: {
      order_id: orderId,
      items: fulfillItems,
      // The courier is recorded here because booking is manual and the carrier
      // genuinely differs per order (§5.1). `/store/track` reads it back.
      ...(carrier ? { metadata: { carrier } } : {}),
      ...(tracking
        ? {
            labels: [
              {
                tracking_number: tracking,
                tracking_url: `https://www.tcsexpress.com/track/${tracking}`,
                label_url: `https://www.tcsexpress.com/track/${tracking}`,
              },
            ],
          }
        : {}),
    },
  });

  logger.info(`Created fulfilment ${(fulfillment as any)?.id} for order ${displayId}`);

  await markOrderFulfillmentAsDeliveredWorkflow(container).run({
    input: { orderId, fulfillmentId: (fulfillment as any).id },
  });

  logger.info(`Order ${displayId} marked delivered.`);
}
