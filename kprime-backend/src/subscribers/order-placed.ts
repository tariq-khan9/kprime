import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { renderOrderPlacedEmail } from "../emails/order-placed";
import { customerEmailFor } from "../lib/customer-email";
import { loadOrderForEmail } from "../lib/load-order-for-email";

/**
 * Sends the order confirmation to the customer.
 *
 * The shop owner's alert is a separate subscriber (order-placed-admin.ts) so the
 * two SMTP sends cannot queue behind each other.
 *
 * Runs after the order is committed, so a mail failure cannot cost a sale — the
 * error is logged and the notification module records it, but the customer keeps
 * their order. That is why this catches rather than rethrows.
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const notificationModuleService = container.resolve(Modules.NOTIFICATION);

  const order = await loadOrderForEmail(container, data.id);

  if (!order) {
    logger.warn(`order.placed: no order found for ${data.id}, skipping email`);
    return;
  }

  // Never `order.email` — that is the synthetic address (§2.2). Most orders
  // have no real one, which is normal and not worth a warning.
  const recipient = customerEmailFor(order);

  if (!recipient) {
    logger.info(
      `order.placed: order ${
        order.display_id ?? order.id
      } has no real email, skipping customer mail`
    );
    return;
  }

  const { subject, html, text } = renderOrderPlacedEmail({
    ...order,
    // Guests have no account, so the email carries their only route back.
    storefront_url: process.env.STOREFRONT_URL,
    country_code: order.shipping_address?.country_code ?? "pk",
  });

  try {
    await notificationModuleService.createNotifications({
      to: recipient,
      channel: "email",
      template: "order-placed",
      content: { subject, html, text },
      // Guards against a duplicate send if the event is redelivered.
      idempotency_key: `order-placed-${order.id}`,
      resource_id: order.id,
      resource_type: "order",
      data: { order_id: order.id, display_id: order.display_id },
    });

    logger.info(
      `order.placed: confirmation email queued for order #${
        order.display_id ?? order.id
      } to ${recipient}`
    );
  } catch (error) {
    logger.error(
      `order.placed: failed to send confirmation for order #${
        order.display_id ?? order.id
      }: ${(error as Error).message}`
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
