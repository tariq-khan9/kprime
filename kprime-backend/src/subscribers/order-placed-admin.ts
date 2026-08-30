import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { loadOrderForEmail } from "../lib/load-order-for-email";
import { notifyAdminAboutOrder } from "../lib/notify-admin";

/**
 * Tells the shop owner a new order arrived.
 *
 * Deliberately a separate subscriber from the customer confirmation rather than
 * two sends inside one handler. When both ran in the same handler the admin
 * notification was intermittently never created at all — no error, no row — and
 * the two sends queueing behind each other was the only thing distinguishing
 * the failing case. Independent subscribers cannot starve each other, and one
 * failing cannot take the other down.
 */
export default async function orderPlacedAdminHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const order = await loadOrderForEmail(container, data.id);

  if (!order) {
    logger.warn(
      `order.placed (admin): no order found for ${data.id}, skipping`
    );
    return;
  }

  await notifyAdminAboutOrder(container, order, "placed", logger);
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
