import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Guest order lookup.
 *
 * Most KPrime buyers check out as guests, so after leaving the confirmation page
 * they have no way back to their order — no account, no history. This endpoint
 * backs the /order/track page.
 *
 * Security notes, because this is unauthenticated:
 *
 * - Lookup needs BOTH the order number and the email used at checkout. Order
 *   numbers are sequential and trivially guessable, so the email is the shared
 *   secret; the number alone must never be enough.
 * - A wrong number and a wrong email return the identical response, so the
 *   endpoint cannot be used to discover which order numbers exist.
 * - Only fields a buyer already saw in their confirmation email are returned.
 *   No internal ids, no payment records, no customer record.
 *
 * Not rate limited at the application level. Sequential numbers plus an unlimited
 * guess rate would let someone enumerate emails against order numbers offline —
 * put a rate limit in front of this before the store is publicly reachable.
 */

type LookupBody = {
  order_number?: string | number;
  email?: string;
};

const GENERIC_ERROR =
  "We couldn't find an order with that number and email. Check both and try again.";

export async function POST(
  req: MedusaRequest<LookupBody>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const rawNumber = req.body?.order_number;
  const rawEmail = req.body?.email;

  // Trim before stripping the "#", not after: people paste " #22 " with spaces,
  // and stripping first leaves the leading space and yields NaN.
  const orderNumber = Number(
    typeof rawNumber === "string"
      ? rawNumber.trim().replace(/^#/, "").trim()
      : rawNumber
  );
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!Number.isInteger(orderNumber) || orderNumber <= 0 || !email) {
    return res.status(400).json({
      message: "An order number and the email used at checkout are both required.",
    });
  }

  const { data: matches } = await query.graph({
    entity: "order",
    fields: ["id"],
    // query.graph types display_id as a string even though the column is an int.
    filters: { display_id: String(orderNumber) },
  });

  const candidate = matches?.[0];

  // Load details separately: requesting totals in a filtered-by-display_id query
  // trips the same "Shipping method version is required to load adjustments"
  // problem documented in subscribers/order-placed.ts.
  const { data: orders } = candidate
    ? await query.graph({
        entity: "order",
        fields: [
          "id",
          "display_id",
          "email",
          "status",
          "created_at",
          "currency_code",
          "subtotal",
          "shipping_total",
          "discount_total",
          "tax_total",
          "total",
          "shipping_methods.version",
          "shipping_methods.name",
          "items.title",
          "items.variant_title",
          "items.quantity",
          "items.total",
          "items.thumbnail",
          "shipping_address.first_name",
          "shipping_address.last_name",
          "shipping_address.address_1",
          "shipping_address.address_2",
          "shipping_address.city",
          "shipping_address.postal_code",
          "shipping_address.country_code",
          "shipping_address.phone",
          "fulfillments.shipped_at",
          "fulfillments.delivered_at",
        ],
        filters: { id: candidate.id },
      })
    : { data: [] };

  const order = orders?.[0];

  // Same response whether the number is unknown or the email does not match, so
  // this cannot be used to probe which order numbers exist.
  if (!order || (order.email ?? "").trim().toLowerCase() !== email) {
    return res.status(404).json({ message: GENERIC_ERROR });
  }

  const fulfillments = (order.fulfillments ?? []).filter(Boolean);
  const shipped = fulfillments.some((f: any) => f?.shipped_at);
  const delivered = fulfillments.some((f: any) => f?.delivered_at);

  return res.json({
    order: {
      display_id: order.display_id,
      status: order.status,
      created_at: order.created_at,
      currency_code: order.currency_code,
      subtotal: order.subtotal,
      shipping_total: order.shipping_total,
      discount_total: order.discount_total,
      tax_total: order.tax_total,
      total: order.total,
      // Derived rather than raw fulfilment records — a buyer wants to know where
      // their parcel is, not the shape of our fulfilment model.
      delivery_state: delivered
        ? "delivered"
        : shipped
          ? "shipped"
          : order.status === "canceled"
            ? "canceled"
            : "processing",
      shipping_method: fulfillments.length
        ? undefined
        : (order.shipping_methods ?? []).filter(Boolean)[0]?.name,
      items: (order.items ?? []).filter(Boolean).map((item: any) => ({
        title: item.title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        total: item.total,
        thumbnail: item.thumbnail,
      })),
      shipping_address: order.shipping_address
        ? {
            first_name: order.shipping_address.first_name,
            last_name: order.shipping_address.last_name,
            address_1: order.shipping_address.address_1,
            address_2: order.shipping_address.address_2,
            city: order.shipping_address.city,
            postal_code: order.shipping_address.postal_code,
            country_code: order.shipping_address.country_code,
            phone: order.shipping_address.phone,
          }
        : null,
    },
  });
}
