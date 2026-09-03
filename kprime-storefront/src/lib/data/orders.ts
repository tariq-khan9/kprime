import type { OrderItem } from "@/components/shared/OrderItemsList"
import { sdk } from "@/lib/sdk"

export type OrderAddress = {
  name: string
  address1: string
  city: string
  province: string | null
  phone: string | null
}

export type OrderSummary = {
  id: string
  /** The human order number, e.g. 138. What a customer quotes back to us. */
  displayId: number
  email: string
  createdAt: string
  items: OrderItem[]
  /** Items only, before delivery. */
  itemTotal: number
  shippingTotal: number
  discountTotal: number
  total: number
  currencyCode: string
  address: OrderAddress | null
  /** Name of the chosen option, which carries its own SLA. */
  shippingMethod: string | null
}

type RawItem = {
  id: string
  title?: string | null
  variant_title?: string | null
  thumbnail?: string | null
  quantity?: number | null
  unit_price?: number | null
}

type RawOrder = {
  id: string
  display_id?: number | null
  email?: string | null
  created_at?: string | null
  currency_code?: string | null
  item_total?: number | null
  shipping_total?: number | null
  discount_total?: number | null
  total?: number | null
  items?: RawItem[] | null
  shipping_methods?: { name?: string | null }[] | null
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    city?: string | null
    province?: string | null
    phone?: string | null
  } | null
}

function toSummary(order: RawOrder): OrderSummary {
  const address = order.shipping_address

  return {
    id: order.id,
    displayId: order.display_id ?? 0,
    email: order.email ?? "",
    createdAt: order.created_at ?? "",
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      title: item.title ?? "",
      variantTitle: item.variant_title ?? null,
      thumbnail: item.thumbnail ?? null,
      quantity: item.quantity ?? 0,
      unitPrice: item.unit_price ?? 0,
    })),
    // `item_total`, NOT `subtotal`. Medusa's `subtotal` on an order already
    // includes delivery, so using it here would show the delivery charge twice
    // — once in the subtotal line and again on its own row.
    itemTotal: order.item_total ?? 0,
    shippingTotal: order.shipping_total ?? 0,
    discountTotal: order.discount_total ?? 0,
    total: order.total ?? 0,
    currencyCode: order.currency_code ?? "pkr",
    address: address
      ? {
          name: [address.first_name, address.last_name]
            .filter(Boolean)
            .join(" "),
          address1: address.address_1 ?? "",
          city: address.city ?? "",
          province: address.province ?? null,
          phone: address.phone ?? null,
        }
      : null,
    shippingMethod: order.shipping_methods?.[0]?.name ?? null,
  }
}

/**
 * One order, by id.
 *
 * **Never cached.** An order belongs to one person, and `unstable_cache` keys
 * on arguments rather than visitor — caching would be the same mistake as
 * caching a cart.
 *
 * Safe to fetch with only the publishable key because the id is a ULID: it is
 * not sequential and cannot be guessed, so holding it is itself the proof that
 * you placed the order. The *display* number (138) is sequential and must never
 * be enough on its own — that is why `/track` demands a phone alongside it.
 *
 * Returns null rather than throwing, so an unknown id becomes a real 404.
 */
export async function getOrder(id: string): Promise<OrderSummary | null> {
  try {
    const { order } = await sdk.client.fetch<{ order: RawOrder }>(
      `/store/orders/${id}`
    )

    return order ? toSummary(order) : null
  } catch {
    return null
  }
}
