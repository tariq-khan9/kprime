"use server"

import { revalidatePath } from "next/cache"

import {
  clearCartId,
  getCart,
  getOrCreateCart,
  type Cart,
} from "@/lib/data/cart"
import { sdk } from "@/lib/sdk"

/**
 * Cart mutations, as server actions.
 *
 * Split from `cart.ts` because a `"use server"` module may only export async
 * functions — types and constants cannot live here. Keeping the data layer next
 * door means server components can read the cart without pulling an action
 * boundary into their bundle.
 *
 * Every action returns the updated cart rather than void, so the caller can
 * refresh the header badge from the response instead of firing a second request
 * to ask what just happened.
 */

export type CartResult =
  | { ok: true; cart: Cart }
  | { ok: false; error: string }

/**
 * Refresh what a mutation invalidates.
 *
 * `revalidatePath`, not `revalidateTag`. The task sheet asks for the tag, but
 * a tag only invalidates *cached* data and the cart is deliberately uncached —
 * it is per-visitor, so caching it would serve one shopper's cart to everyone.
 * Next 16 also now requires a cache-life profile on `revalidateTag`, which
 * there is nothing here to supply. The path call is what actually rebuilds the
 * cart page after a change.
 */
async function refresh(): Promise<void> {
  revalidatePath("/cart")
}

function failed(error: unknown, fallback: string): { ok: false; error: string } {
  // Medusa's message is usually the useful one ("Variant does not have enough
  // inventory"), but never let a raw backend error reach the UI unlabelled.
  const message = error instanceof Error ? error.message : ""

  return { ok: false, error: message || fallback }
}

/**
 * Add a variant, creating the cart on first use.
 *
 * Adding the same variant twice increments the existing line rather than
 * creating a second one. That is Medusa's own behaviour — verified against the
 * live API, not assumed — so there is deliberately no read-then-update here.
 */
export async function addToCart(
  variantId: string,
  quantity = 1
): Promise<CartResult> {
  if (!variantId) {
    return { ok: false, error: "No variant selected." }
  }

  try {
    const cart = await getOrCreateCart()

    await sdk.store.cart.createLineItem(cart.id, {
      variant_id: variantId,
      quantity,
    })

    await refresh()

    // Re-read rather than trusting the create response: totals are recalculated
    // server-side and the merged line's quantity is only correct after.
    const updated = await getCart()

    return updated
      ? { ok: true, cart: updated }
      : { ok: false, error: "The cart could not be read back." }
  } catch (error) {
    return failed(error, "Could not add this item to your cart.")
  }
}

export async function updateLineQuantity(
  lineId: string,
  quantity: number
): Promise<CartResult> {
  // Zero means remove. Letting it through would ask Medusa for a line of
  // nothing, which it rejects.
  if (quantity < 1) {
    return removeLine(lineId)
  }

  try {
    const cart = await getCart()

    if (!cart) {
      return { ok: false, error: "Your cart has expired." }
    }

    await sdk.store.cart.updateLineItem(cart.id, lineId, { quantity })
    await refresh()

    const updated = await getCart()

    return updated
      ? { ok: true, cart: updated }
      : { ok: false, error: "The cart could not be read back." }
  } catch (error) {
    return failed(error, "Could not update the quantity.")
  }
}

export async function removeLine(lineId: string): Promise<CartResult> {
  try {
    const cart = await getCart()

    if (!cart) {
      return { ok: false, error: "Your cart has expired." }
    }

    await sdk.store.cart.deleteLineItem(cart.id, lineId)
    await refresh()

    const updated = await getCart()

    return updated
      ? { ok: true, cart: updated }
      : { ok: false, error: "The cart could not be read back." }
  } catch (error) {
    return failed(error, "Could not remove this item.")
  }
}

/**
 * Item count for the header badge.
 *
 * An action rather than a route handler so the header can read the cart without
 * the layout touching cookies — a layout that reads cookies turns every page
 * dynamic, which would cost the static generation on `/` and every product
 * page.
 */
export async function readCartCount(): Promise<number> {
  const cart = await getCart()

  return cart?.itemCount ?? 0
}

/** Drops the cookie. Used when a stale cart id cannot be recovered (task 101). */
export async function abandonCart(): Promise<void> {
  await clearCartId()
  await refresh()
}
