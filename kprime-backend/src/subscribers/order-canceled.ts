import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { loadOrderForEmail } from "../lib/load-order-for-email";
import { notifyAdminAboutOrder } from "../lib/notify-admin";

/**
 * Tells the shop owner an order was cancelled, so nothing gets dispatched for it.
 *
 * The customer is not emailed here. Cancellations happen for several different
 * reasons — out of stock, a failed COD confirmation call, a duplicate — and a
 * single generic "your order was cancelled" message would be wrong or alarming
 * in most of them. Better handled deliberately than automatically.
 */
export default async function orderCanceledHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const order = await loadOrderForEmail(container, data.id);

  if (!order) {
    logger.warn(`order.canceled: no order found for ${data.id}, skipping`);
    return;
  }

  await notifyAdminAboutOrder(container, order, "canceled", logger);
}

export const config: SubscriberConfig = {
  event: "order.canceled",
};
