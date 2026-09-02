"use server"

import { revalidatePath } from "next/cache"

import { clearCartId, getCartId } from "@/lib/data/cart"
import {
  completeOrder,
  ensurePaymentSession,
  saveAddress,
  saveContact,
  saveShippingMethod,
  type AddressDetails,
  type CheckoutResult,
  type ContactDetails,
  type PlaceOrderResult,
} from "@/lib/data/checkout"

/**
 * Checkout mutations, as server actions.
 *
 * Split from `checkout.ts` for the same reason the cart is: a `"use server"`
 * module may only export async functions, so the types and validation live next
 * door.
 *
 * Each action resolves the cart id from the cookie itself rather than taking it
 * as an argument. A cart id arriving from the client would be a parameter an
 * attacker controls — it would let anyone write an address onto someone else's
 * cart by guessing an id.
 */

const NO_CART: CheckoutResult = {
  ok: false,
  errors: [{ message: "Your cart has expired. Add an item and try again." }],
}

export async function saveContactAction(
  details: ContactDetails
): Promise<CheckoutResult> {
  const cartId = await getCartId()

  if (!cartId) {
    return NO_CART
  }

  const result = await saveContact(cartId, details)

  if (result.ok) {
    revalidatePath("/checkout")
  }

  return result
}

export async function saveAddressAction(
  details: AddressDetails,
  contactName: string,
  contactPhone: string
): Promise<CheckoutResult> {
  const cartId = await getCartId()

  if (!cartId) {
    return NO_CART
  }

  const result = await saveAddress(cartId, details, contactName, contactPhone)

  if (result.ok) {
    revalidatePath("/checkout")
  }

  return result
}

export async function saveShippingMethodAction(
  optionId: string
): Promise<CheckoutResult> {
  const cartId = await getCartId()

  if (!cartId) {
    return NO_CART
  }

  const result = await saveShippingMethod(cartId, optionId)

  if (result.ok) {
    revalidatePath("/checkout")
  }

  return result
}

export async function ensurePaymentSessionAction(): Promise<CheckoutResult> {
  const cartId = await getCartId()

  if (!cartId) {
    return NO_CART
  }

  return ensurePaymentSession(cartId)
}

/**
 * Places the order.
 *
 * The cart cookie is dropped only after an order exists, so a failure leaves
 * the shopper with their cart and a message rather than nothing at all.
 */
export async function placeOrderAction(): Promise<PlaceOrderResult> {
  const cartId = await getCartId()

  if (!cartId) {
    return {
      ok: false,
      errors: [{ message: "Your cart has expired. Add an item and try again." }],
    }
  }

  const result = await completeOrder(cartId)

  if (result.ok) {
    await clearCartId()
    revalidatePath("/cart")
  }

  return result
}
