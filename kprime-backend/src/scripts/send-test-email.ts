import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { renderOrderPlacedEmail } from "../emails/order-placed";

/**
 * Sends the order-confirmation email for the most recent order, so the SMTP
 * setup can be checked without placing a new order each time.
 *
 *   npx medusa exec ./src/scripts/send-test-email.ts
 *   npx medusa exec ./src/scripts/send-test-email.ts you@example.com
 *
 * With SMTP_HOST / SMTP_USER / SMTP_PASSWORD set this sends real mail. Without
 * them the console provider logs it instead, which still exercises the template.
 */
export default async function sendTestEmail({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationModuleService: any = container.resolve(Modules.NOTIFICATION);

  // Two steps on purpose. Asking for totals in a paginated/ordered query still
  // throws "Shipping method version is required to load adjustments" even with
  // shipping_methods.version selected; filtering by a known id does not.
  const { data: recent } = await query.graph({
    entity: "order",
    fields: ["id"],
    pagination: { order: { created_at: "DESC" }, take: 1 },
  });

  const orderId = recent?.[0]?.id;
  if (!orderId) {
    logger.error("No orders found. Place an order first, or run `npm run verify`.");
    return;
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "subtotal",
      "shipping_total",
      "tax_total",
      "discount_total",
      "total",
      // See the note in subscribers/order-placed.ts.
      "shipping_methods.version",
      "items.title",
      "items.variant_title",
      "items.quantity",
      "items.total",
      "shipping_address.*",
    ],
    filters: { id: orderId },
  });

  const order = orders?.[0];
  if (!order) {
    logger.error("No orders found. Place an order first, or run `npm run verify`.");
    return;
  }

  const recipient = args?.[0] || order.email;
  if (!recipient) {
    logger.error("No recipient. Pass one as an argument.");
    return;
  }

  const { subject, html, text } = renderOrderPlacedEmail({
    ...order,
    storefront_url: process.env.STOREFRONT_URL,
    country_code: order.shipping_address?.country_code ?? "pk",
  });

  try {
    const result = await notificationModuleService.createNotifications({
      to: recipient,
      channel: "email",
      template: "order-placed",
      content: { subject, html, text },
      idempotency_key: `test-email-${Date.now()}`,
      resource_id: order.id,
      resource_type: "order",
    });

    logger.info(
      `Sent order #${order.display_id} confirmation to ${recipient} ` +
        `via ${result?.provider_id ?? "unknown provider"} (${result?.id}).`
    );
    if (result?.provider_id === "notification-local") {
      logger.info(
        "That was the console provider — set SMTP_HOST, SMTP_USER and SMTP_PASSWORD " +
          "in kprime-backend/.env and restart to send real mail."
      );
    }
  } catch (error) {
    logger.error(`Failed to send: ${(error as Error).message}`);
  }
}
