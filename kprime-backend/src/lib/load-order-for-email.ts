import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Loads the order fields the email templates need.
 *
 * Shared because every notification subscriber needs the same shape, and the
 * query has two traps worth encoding once:
 *
 * - Asking for order totals makes the order repository load shipping-method
 *   adjustments, which throws "Shipping method version is required to load
 *   adjustments" unless `shipping_methods.version` is selected.
 * - The same query still throws when paginated/ordered rather than filtered by
 *   id, so callers must already know the order id.
 */
export const ORDER_EMAIL_FIELDS = [
  "id",
  "display_id",
  "email",
  "status",
  "created_at",
  "currency_code",
  "subtotal",
  "shipping_total",
  "tax_total",
  "discount_total",
  "total",
  "shipping_methods.version",
  "shipping_methods.name",
  "items.title",
  "items.variant_title",
  "items.variant_sku",
  "items.quantity",
  "items.total",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
  "shipping_address.postal_code",
  "shipping_address.country_code",
  "shipping_address.phone",
];

export const loadOrderForEmail = async (
  container: { resolve: (key: string) => any },
  orderId: string
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ORDER_EMAIL_FIELDS,
    filters: { id: orderId },
  });

  return orders?.[0] ?? null;
};
