import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { customerEmailFor } from "../lib/customer-email";

/**
 * Tells the customer their parcel is on its way.
 *
 * **Carries the carrier, the tracking number and the tracking URL (§5.1).**
 * Booking is manual and the courier differs per order, so none of it can be
 * assumed — it is read from the fulfilment the shop created. Without those three
 * the mail is just "it shipped", which tells nobody anything they can act on.
 *
 * Only sent when a real email exists. `order.email` is the synthetic address for
 * every guest order and mailing it produces a hard bounce, so the recipient is
 * resolved through `customerEmailFor`.
 *
 * Never rethrows: the parcel is already with the courier, and a mail failure
 * must not surface as a workflow error on an order that is otherwise fine.
 */
export default async function orderShippedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ order_id?: string; id?: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationModuleService = container.resolve(Modules.NOTIFICATION);

  const orderId = data.order_id ?? data.id;

  if (!orderId) {
    return;
  }

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "metadata",
        "shipping_address.first_name",
        "fulfillments.id",
        "fulfillments.provider_id",
        "fulfillments.metadata",
        "fulfillments.labels.tracking_number",
        "fulfillments.labels.tracking_url",
      ],
      filters: { id: orderId },
    });

    const order = orders?.[0];

    if (!order) {
      return;
    }

    const recipient = customerEmailFor(order);

    if (!recipient) {
      logger.info(
        `order.shipped: order ${order.display_id} has no real email, skipping`
      );
      return;
    }

    const fulfillments = (order.fulfillments ?? []).filter(Boolean);

    const withLabel = fulfillments.find((f: any) =>
      (f?.labels ?? []).some((l: any) => l?.tracking_number)
    );

    const label = (withLabel?.labels ?? []).find(
      (l: any) => l?.tracking_number
    );

    const carrier =
      (typeof withLabel?.metadata?.carrier === "string"
        ? withLabel.metadata.carrier
        : null) ?? "our courier";

    const name = order.shipping_address?.first_name ?? "there";
    const trackUrl = `${process.env.STOREFRONT_URL ?? ""}/track`;

    const trackingLines = label?.tracking_number
      ? `<p><strong>Carrier:</strong> ${carrier}</p>
         <p><strong>Tracking number:</strong> ${label.tracking_number}</p>
         ${
           label.tracking_url
             ? `<p><a href="${label.tracking_url}">Track it on the courier's site</a></p>`
             : ""
         }`
      : // A fulfilment without a label is still worth telling someone about;
        // it just cannot promise a number that does not exist.
        `<p>We will send the tracking number as soon as the courier gives us one.</p>`

    const html = `
      <p>Hi ${name},</p>
      <p>Your order #${order.display_id} is on its way.</p>
      ${trackingLines}
      <p>You pay the rider in cash when it arrives.</p>
      <p><a href="${trackUrl}">Check your order</a> any time with your order number and phone number.</p>
    `

    const text = [
      `Hi ${name},`,
      `Your order #${order.display_id} is on its way.`,
      label?.tracking_number
        ? `Carrier: ${carrier}\nTracking number: ${label.tracking_number}${
            label.tracking_url ? `\n${label.tracking_url}` : ""
          }`
        : "We will send the tracking number as soon as the courier gives us one.",
      "You pay the rider in cash when it arrives.",
      `Check your order at ${trackUrl}`,
    ].join("\n\n")

    await notificationModuleService.createNotifications({
      to: recipient,
      channel: "email",
      template: "order-shipped",
      content: {
        subject: `Your order #${order.display_id} is on its way`,
        html,
        text,
      },
      // Keyed on the fulfilment, not the order: a second parcel for the same
      // order is a second, legitimate email.
      idempotency_key: `order-shipped-${withLabel?.id ?? orderId}`,
      resource_id: String(orderId),
      resource_type: "order",
    });

    logger.info(
      `order.shipped: dispatch email queued for #${order.display_id} to ${recipient}`
    );
  } catch (error) {
    logger.error(
      `order.shipped: could not send for ${orderId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
};
