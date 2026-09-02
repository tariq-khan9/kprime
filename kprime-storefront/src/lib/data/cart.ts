import { cookies } from "next/headers"

import { sdk } from "@/lib/sdk"

/**
 * Cart id cookie.
 *
 * httpOnly, so script on the page cannot read or forge it — the cart is the
 * only piece of state that survives between visits and it is the thing an
 * attacker would want to swap. This is the one exception CLAUDE.md allows to
 * "no browser storage", and it is a cookie rather than localStorage precisely
 * because the server needs it during render.
 */
export const CART_COOKIE = "kprime_cart_id"

/** Long enough that a shopper can come back next week to a full cart. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export type CartLine = {
  id: string
  title: string
  /** "Black / Large", or null when the product has no variant-defining options. */
  variantTitle: string | null
  variantId: string
  productHandle: string | null
  thumbnail: string | null
  quantity: number
  unitPrice: number
  total: number
  /** Newest-first ordering in the drawer, so a new add lands at the top. */
  createdAt: string
}

export type Cart = {
  id: string
  items: CartLine[]
  /** Sum of quantities, not lines — the header badge counts items. */
  itemCount: number
  subtotal: number
  /** Zero until an address picks a shipping option. */
  shippingTotal: number
  total: number
  currencyCode: string
}

/**
 * Trimmed to what the cart, drawer and header badge render.
 *
 * Named explicitly rather than wildcarded: Medusa's field selection is
 * all-or-nothing, and a wildcard here would drag the whole payment and
 * shipping graph into every header render.
 */
const CART_FIELDS = [
  "id",
  "currency_code",
  "subtotal",
  "shipping_total",
  "total",
  "items.id",
  "items.title",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "items.thumbnail",
  "items.variant_id",
  "items.variant_title",
  "items.product_handle",
  "items.created_at",
].join(",")

type RawLine = {
  id: string
  title?: string | null
  quantity?: number | null
  unit_price?: number | null
  total?: number | null
  thumbnail?: string | null
  variant_id?: string | null
  variant_title?: string | null
  product_handle?: string | null
  created_at?: string | null
}

type RawCart = {
  id: string
  currency_code?: string | null
  subtotal?: number | null
  shipping_total?: number | null
  total?: number | null
  items?: RawLine[] | null
}

function toCart(cart: RawCart): Cart {
  const items: CartLine[] = (cart.items ?? []).map((line) => ({
    id: line.id,
    title: line.title ?? "",
    variantTitle: line.variant_title ?? null,
    variantId: line.variant_id ?? "",
    productHandle: line.product_handle ?? null,
    thumbnail: line.thumbnail ?? null,
    quantity: line.quantity ?? 0,
    unitPrice: line.unit_price ?? 0,
    total: line.total ?? 0,
    createdAt: line.created_at ?? "",
  }))

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: cart.subtotal ?? 0,
    shippingTotal: cart.shipping_total ?? 0,
    total: cart.total ?? 0,
    currencyCode: cart.currency_code ?? "pkr",
  }
}

/** The id in the cookie, or null. Safe to call while rendering. */
export async function getCartId(): Promise<string | null> {
  const store = await cookies()

  return store.get(CART_COOKIE)?.value ?? null
}

/**
 * Writable only from a server action or route handler.
 *
 * Next forbids setting a cookie during a render, so cart creation cannot happen
 * on a GET — which is why `getCart` never creates one.
 */
export async function setCartId(id: string): Promise<void> {
  const store = await cookies()

  store.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
}

export async function clearCartId(): Promise<void> {
  const store = await cookies()

  store.delete(CART_COOKIE)
}

/**
 * The current cart, or null when there is no cookie or the cart is gone.
 *
 * **Never cached.** `unstable_cache` is keyed by arguments, not by visitor, so
 * caching this would serve one shopper's cart to everybody. It is also why any
 * page reading it has to be dynamic.
 *
 * A cookie pointing at a cart the backend no longer has resolves to null rather
 * than throwing — the database gets reseeded often in development, and a stale
 * id must not turn every page into an error. Task 101 covers clearing it.
 */
export async function getCart(): Promise<Cart | null> {
  const id = await getCartId()

  if (!id) {
    return null
  }

  try {
    const { cart } = await sdk.client.fetch<{ cart: RawCart }>(
      `/store/carts/${id}`,
      { query: { fields: CART_FIELDS } }
    )

    return cart ? toCart(cart) : null
  } catch {
    return null
  }
}

/** Sum of line quantities, for the header badge. */
export async function getCartItemCount(): Promise<number> {
  const cart = await getCart()

  return cart?.itemCount ?? 0
}

/**
 * The cart to mutate, creating one if this is the shopper's first add.
 *
 * Action-only, because it writes the cookie. The sales channel is not passed:
 * the publishable key already scopes the cart to one, and naming it here would
 * be a second source of truth that could disagree.
 */
export async function getOrCreateCart(): Promise<Cart> {
  const existing = await getCart()

  if (existing) {
    return existing
  }

  const { regions } = await sdk.store.region.list({
    fields: "id,countries.iso_2",
  })

  const country = (process.env.NEXT_PUBLIC_DEFAULT_REGION ?? "pk").toLowerCase()

  const region =
    regions.find((r) => r.countries?.some((c) => c.iso_2?.toLowerCase() === country)) ??
    regions[0]

  if (!region) {
    throw new Error("No region configured. A cart cannot be created without one.")
  }

  const { cart } = await sdk.store.cart.create({ region_id: region.id })

  await setCartId(cart.id)

  return toCart(cart as RawCart)
}

/** What is wrong with one line, if anything (task 101). */
export type CartIssueKind =
  | "unavailable"
  | "out_of_stock"
  | "insufficient_stock"

export type CartIssue = {
  lineId: string
  title: string
  kind: CartIssueKind
  /** How many can actually be bought, for `insufficient_stock`. */
  available?: number
}

/** Live stock for one variant. Deliberately not read from the product cache. */
type VariantStock = {
  manageInventory: boolean
  allowBackorder: boolean
  inventoryQuantity: number | null
}

/**
 * Fresh inventory for the handles in a cart.
 *
 * **Uncached, unlike every other product read in this app.** `getProduct` is
 * cached for an hour, so validating a cart against it would happily report
 * "in stock" for something that sold out fifty minutes ago — the exact case
 * this check exists to catch. Confirmed in practice: dropping stock behind a
 * cart produced no warning at all until this stopped going through the cache.
 *
 * One request per distinct handle in the cart, which is a handful at most.
 */
async function fetchLiveStock(
  handles: string[]
): Promise<Map<string, VariantStock | null>> {
  const stock = new Map<string, VariantStock | null>()

  await Promise.all(
    [...new Set(handles)].map(async (handle) => {
      try {
        const { products } = await sdk.client.fetch<{
          products: {
            variants?: {
              id: string
              manage_inventory?: boolean | null
              allow_backorder?: boolean | null
              inventory_quantity?: number | null
            }[] | null
          }[]
        }>("/store/products", {
          query: {
            handle,
            limit: 1,
            // Named explicitly: the `*variants` wildcard omits inventory.
            fields:
              "variants.id,variants.manage_inventory,variants.allow_backorder,variants.inventory_quantity",
          },
        })

        const product = products?.[0]

        // No product means deleted, unpublished, or out of this sales channel.
        if (!product) {
          stock.set(handle, null)
          return
        }

        for (const variant of product.variants ?? []) {
          stock.set(`${handle}:${variant.id}`, {
            manageInventory: variant.manage_inventory ?? false,
            allowBackorder: variant.allow_backorder ?? false,
            inventoryQuantity: variant.inventory_quantity ?? null,
          })
        }

        stock.set(handle, {
          manageInventory: false,
          allowBackorder: false,
          inventoryQuantity: null,
        })
      } catch {
        // A failed lookup must not invent a problem. Better to show the cart as
        // it is than to tell someone an item is gone because a request failed.
        stock.set(handle, undefined as unknown as VariantStock)
      }
    })
  )

  return stock
}

/**
 * Problems that appeared after items were added.
 *
 * Medusa refuses to add a variant it cannot fulfil, so none of these can happen
 * at add time — verified against the live API, which rejects both an
 * out-of-stock variant and an over-large quantity. They arise later: another
 * shopper takes the last one, or the merchant unpublishes a product while it
 * sits in someone's cart.
 *
 * The cart stays usable either way — this reports, it does not mutate. Removing
 * someone's line for them, without asking, is worse than telling them.
 */
export async function findCartIssues(cart: Cart): Promise<CartIssue[]> {
  const handles = cart.items
    .map((line) => line.productHandle)
    .filter((handle): handle is string => Boolean(handle))

  const stock = await fetchLiveStock(handles)

  const issues: CartIssue[] = []

  for (const line of cart.items) {
    if (!line.productHandle) {
      issues.push({ lineId: line.id, title: line.title, kind: "unavailable" })
      continue
    }

    const product = stock.get(line.productHandle)

    // undefined means the lookup failed; null means the product is gone.
    if (product === undefined) {
      continue
    }

    if (product === null) {
      issues.push({ lineId: line.id, title: line.title, kind: "unavailable" })
      continue
    }

    const variant = stock.get(`${line.productHandle}:${line.variantId}`)

    if (!variant) {
      issues.push({ lineId: line.id, title: line.title, kind: "unavailable" })
      continue
    }

    if (!variant.manageInventory || variant.allowBackorder) {
      continue
    }

    const available = variant.inventoryQuantity

    if (available === null) {
      continue
    }

    if (available <= 0) {
      issues.push({ lineId: line.id, title: line.title, kind: "out_of_stock" })
    } else if (line.quantity > available) {
      issues.push({
        lineId: line.id,
        title: line.title,
        kind: "insufficient_stock",
        available,
      })
    }
  }

  return issues
}
