import { Modules } from "@medusajs/framework/utils";

import {
  renderAdminOrderEmail,
  type AdminOrderEvent,
} from "../emails/admin-order";

/**
 * Emails the shop owner about an order.
 *
 * Silently does nothing when ADMIN_NOTIFICATION_EMAIL is unset, so a fresh clone
 * still boots and orders still complete. Multiple addresses may be given,
 * comma-separated.
 *
 * Failures are logged, never thrown: the order is already committed by the time
 * a subscriber runs, and the customer must not be affected by the shop's own
 * mail problems.
 */
export const notifyAdminAboutOrder = async (
  container: { resolve: (key: string) => any },
  order: any,
  event: AdminOrderEvent,
  logger: { info: (m: string) => void; error: (m: string) => void }
) => {
  const recipients = (process.env.ADMIN_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  if (!recipients.length) {
    return;
  }

  const notificationModuleService = container.resolve(Modules.NOTIFICATION);

  const { subject, html, text } = renderAdminOrderEmail(
    {
      ...order,
      admin_url: process.env.MEDUSA_ADMIN_URL ?? process.env.MEDUSA_BACKEND_URL,
    },
    event
  );

  for (const to of recipients) {
    try {
      await notificationModuleService.createNotifications({
        to,
        channel: "email",
        template: `admin-order-${event}`,
        content: { subject, html, text },
        // One admin notification per order per event, even if the event is
        // redelivered. Includes the recipient so several addresses each get one.
        idempotency_key: `admin-${event}-${order.id}-${to}`,
        resource_id: order.id,
        resource_type: "order",
      });
      logger.info(
        `order.${event}: admin notified at ${to} for order #${order.display_id}`
      );
    } catch (error) {
      logger.error(
        `order.${event}: failed to notify admin at ${to} for order #${
          order.display_id
        }: ${(error as Error).message}`
      );
    }
  }
};
