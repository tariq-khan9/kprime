import type { OrderItem } from "@/components/shared/OrderItemsList"
import { sdk } from "@/lib/sdk"

export type DeliveryState =
  | "processing"
  | "shipped"
  | "delivered"
  | "canceled"

export type TrackedOrder = {
  displayId: number
  createdAt: string
  deliveryState: DeliveryState
  items: OrderItem[]
  itemTotal: number
  shippingTotal: number
  discountTotal: number
  total: number
  shippingMethod: string | null
  address: {
    name: string
    address1: string
    city: string
    province: string | null
  } | null
  tracking: {
    /** Whatever the shop recorded. Manual booking, so it varies per order. */
    carrier: string | null
    number: string
    url: string | null
  } | null
}

export type TrackResult =
  | { ok: true; order: TrackedOrder }
  | { ok: false; message: string }

/**
 * One message for every failure the shopper can see.
 *
 * Distinguishing "no such order" from "wrong phone" would let this be used to
 * confirm which order numbers exist. The backend already returns one body for
 * both; this makes sure the storefront cannot accidentally add detail.
 */
const GENERIC =
  "We could not find an order with that number and phone. Check both and try again."

type RawTracked = {
  display_id?: number | null
  created_at?: string | null
  delivery_state?: DeliveryState | null
  item_total?: number | null
  shipping_total?: number | null
  discount_total?: number | null
  total?: number | null
  shipping_method?: string | null
  items?: {
    id: string
    title?: string | null
    variant_title?: string | null
    quantity?: number | null
    unit_price?: number | null
    thumbnail?: string | null
  }[]
  shipping_address?: {
    name?: string | null
    address_1?: string | null
    city?: string | null
    province?: string | null
  } | null
  tracking?: {
    carrier?: string | null
    number?: string | null
    url?: string | null
  } | null
}

/**
 * Looks an order up by number and phone.
 *
 * **The raw phone is passed straight through to the API boundary (§2.2).** It
 * is normalised on the backend, by the same rules as everywhere else. Cleaning
 * it here first would be a second place those rules could drift.
 */
export async function trackOrder(
  orderNumber: string,
  phone: string
): Promise<TrackResult> {
  try {
    const { order } = await sdk.client.fetch<{ order: RawTracked }>(
      "/store/track",
      { method: "POST", body: { order_number: orderNumber, phone } }
    )

    if (!order) {
      return { ok: false, message: GENERIC }
    }

    return {
      ok: true,
      order: {
        displayId: order.display_id ?? 0,
        createdAt: order.created_at ?? "",
        deliveryState: order.delivery_state ?? "processing",
        items: (order.items ?? []).map((item) => ({
          id: item.id,
          title: item.title ?? "",
          variantTitle: item.variant_title ?? null,
          thumbnail: item.thumbnail ?? null,
          quantity: item.quantity ?? 0,
          unitPrice: item.unit_price ?? 0,
        })),
        itemTotal: order.item_total ?? 0,
        shippingTotal: order.shipping_total ?? 0,
        discountTotal: order.discount_total ?? 0,
        total: order.total ?? 0,
        shippingMethod: order.shipping_method ?? null,
        address: order.shipping_address
          ? {
              name: order.shipping_address.name ?? "",
              address1: order.shipping_address.address_1 ?? "",
              city: order.shipping_address.city ?? "",
              province: order.shipping_address.province ?? null,
            }
          : null,
        tracking: order.tracking?.number
          ? {
              carrier: order.tracking.carrier ?? null,
              number: order.tracking.number,
              url: order.tracking.url ?? null,
            }
          : null,
      },
    }
  } catch (error) {
    // A 429 is the one failure worth distinguishing: it is about the request
    // rate, not about whether the order exists, so saying so reveals nothing.
    const message = error instanceof Error ? error.message : ""

    if (message.includes("429") || message.toLowerCase().includes("too many")) {
      return {
        ok: false,
        message: "Too many attempts. Please wait a minute and try again.",
      }
    }

    return { ok: false, message: GENERIC }
  }
}
