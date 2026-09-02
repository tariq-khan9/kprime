import { getCart, type Cart } from "@/lib/data/cart"
import { isDeliverableCity } from "@/lib/data/shipping"
import { normalizePhone, syntheticEmail } from "@/lib/identity/phone"
import { sdk } from "@/lib/sdk"

/**
 * Checkout writes.
 *
 * **This module is the API boundary for phone numbers (§2.2).** `normalizePhone`
 * runs here and nowhere else — no component, no form, no template handles a raw
 * number. Everything downstream reads the normalised string.
 */

export type ContactDetails = {
  name: string
  /** Raw, as typed. Normalised inside this module, never by the caller. */
  phone: string
  /** Optional. Never becomes `cart.email`. */
  email?: string
}

export type AddressDetails = {
  address1: string
  city: string
  /** Province code, e.g. "kp". */
  province: string
  /** Optional second number for the courier. Normalised like the first. */
  deliveryPhone?: string
  /** Optional free-text landmark. */
  landmark?: string
}

export type CheckoutError = { field?: string; message: string }

export type CheckoutResult =
  | { ok: true; cart: Cart }
  | { ok: false; errors: CheckoutError[] }

export type CheckoutStepName = "contact" | "address" | "delivery" | "review"

/**
 * Fields the checkout steps read back to prefill themselves.
 *
 * Kept out of `Cart` because nothing else needs them — the header badge should
 * not be dragging an address around.
 */
export type CheckoutState = {
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  address1: string | null
  city: string | null
  province: string | null
  deliveryPhone: string | null
  landmark: string | null
  shippingOptionId: string | null
  /** The furthest step reachable given what is filled in. */
  furthestStep: CheckoutStepName
}

type RawAddress = {
  address_1?: string | null
  city?: string | null
  province?: string | null
  phone?: string | null
}

type RawCheckoutCart = {
  email?: string | null
  metadata?: Record<string, unknown> | null
  shipping_address?: RawAddress | null
  shipping_methods?: { shipping_option_id?: string | null }[] | null
}

const STATE_FIELDS = [
  "id",
  "email",
  "metadata",
  "shipping_address.address_1",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.phone",
  "shipping_methods.shipping_option_id",
].join(",")

/**
 * What has been filled in so far.
 *
 * Read from the cart rather than held in React state, so a refresh or a back
 * button mid-checkout resumes exactly where the shopper was (task 114).
 */
export async function getCheckoutState(
  cartId: string
): Promise<CheckoutState | null> {
  try {
    const { cart } = await sdk.client.fetch<{ cart: RawCheckoutCart }>(
      `/store/carts/${cartId}`,
      { query: { fields: STATE_FIELDS } }
    )

    if (!cart) {
      return null
    }

    const metadata = cart.metadata ?? {}
    const address = cart.shipping_address ?? null

    const str = (value: unknown) => (typeof value === "string" ? value : null)

    const contactPhone = str(metadata.contact_phone)
    const contactName = str(metadata.contact_name)
    const shippingOptionId = cart.shipping_methods?.[0]?.shipping_option_id ?? null

    const hasContact = Boolean(contactPhone && contactName)
    const hasAddress = Boolean(address?.address_1 && address?.city)

    return {
      contactName,
      contactPhone,
      contactEmail: str(metadata.contact_email),
      address1: address?.address_1 ?? null,
      city: address?.city ?? null,
      province: address?.province ?? null,
      deliveryPhone: address?.phone ?? null,
      landmark: str(metadata.landmark),
      shippingOptionId,
      furthestStep: !hasContact
        ? "contact"
        : !hasAddress
          ? "address"
          : !shippingOptionId
            ? "delivery"
            : "review",
    }
  } catch {
    return null
  }
}

function fail(error: unknown, fallback: string): CheckoutResult {
  return {
    ok: false,
    errors: [
      { message: error instanceof Error ? error.message : fallback },
    ],
  }
}

async function readBack(): Promise<CheckoutResult> {
  const cart = await getCart()

  return cart
    ? { ok: true, cart }
    : { ok: false, errors: [{ message: "Your cart has expired." }] }
}

/**
 * Writes contact details.
 *
 * **`cart.email` is ALWAYS the synthetic address**, even when a real one was
 * typed (§2.2). The real address goes to `metadata.contact_email` and is only
 * used to write to someone. That is what makes the phone number the identity:
 * two shoppers sharing an email, or one person using two, still resolve to the
 * right customer.
 */
export async function saveContact(
  cartId: string,
  details: ContactDetails
): Promise<CheckoutResult> {
  const errors: CheckoutError[] = []
  const name = details.name.trim()

  if (name.length < 2) {
    errors.push({ field: "name", message: "Please enter your name." })
  }

  const phone = normalizePhone(details.phone)

  if (!phone) {
    errors.push({
      field: "phone",
      message: "Enter a Pakistani mobile number, like 0300 1234567.",
    })
  }

  const email = details.email?.trim() || null

  // Only checked when supplied. The field is optional; an empty one is fine.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: "email", message: "That email address looks wrong." })
  }

  if (errors.length > 0 || !phone) {
    return { ok: false, errors }
  }

  try {
    await sdk.store.cart.update(cartId, {
      email: syntheticEmail(phone),
      metadata: {
        contact_name: name,
        contact_phone: phone,
        ...(email ? { contact_email: email } : {}),
      },
    })

    return await readBack()
  } catch (error) {
    return fail(error, "Could not save your details.")
  }
}

/**
 * Writes the shipping address.
 *
 * The city is validated against the deliverable list before it is written. A
 * city matching no geo zone returns zero shipping options with no error of its
 * own, and checkout dead-ends at the next step with nothing to explain why
 * (§5.1).
 *
 * **No postal code, ever** (§2.2).
 */
export async function saveAddress(
  cartId: string,
  details: AddressDetails,
  contactName: string,
  contactPhone: string
): Promise<CheckoutResult> {
  const errors: CheckoutError[] = []
  const address1 = details.address1.trim()

  if (address1.length < 5) {
    errors.push({
      field: "address1",
      message: "Enter a street address we can deliver to.",
    })
  }

  if (!details.province) {
    errors.push({ field: "province", message: "Choose a province." })
  }

  if (!details.city) {
    errors.push({ field: "city", message: "Choose a city." })
  } else if (!(await isDeliverableCity(details.city))) {
    errors.push({ field: "city", message: "We do not deliver to that city yet." })
  }

  const typedDelivery = details.deliveryPhone?.trim()
  const deliveryPhone = typedDelivery ? normalizePhone(typedDelivery) : null

  if (typedDelivery && !deliveryPhone) {
    errors.push({
      field: "deliveryPhone",
      message: "Enter a Pakistani mobile number, or leave this blank.",
    })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  // Medusa wants the name split. A single-word name leaves an empty last name
  // rather than duplicating the first.
  const parts = contactName.trim().split(/\s+/)

  try {
    await sdk.store.cart.update(cartId, {
      shipping_address: {
        first_name: parts[0] ?? "",
        last_name: parts.slice(1).join(" "),
        address_1: address1,
        city: details.city,
        province: details.province,
        country_code: "pk",
        // The delivery number when one was given, otherwise the contact one —
        // the courier needs someone to call at the door.
        phone: deliveryPhone ?? contactPhone,
      },
      ...(details.landmark?.trim()
        ? { metadata: { landmark: details.landmark.trim() } }
        : {}),
    })

    return await readBack()
  } catch (error) {
    return fail(error, "Could not save your address.")
  }
}

/**
 * Chooses a shipping method.
 *
 * Medusa replaces any previously selected method rather than adding a second,
 * so changing the choice does not accumulate charges.
 */
export async function saveShippingMethod(
  cartId: string,
  optionId: string
): Promise<CheckoutResult> {
  if (!optionId) {
    return {
      ok: false,
      errors: [{ field: "option", message: "Choose a delivery option." }],
    }
  }

  try {
    await sdk.store.cart.addShippingMethod(cartId, { option_id: optionId })

    return await readBack()
  } catch (error) {
    return fail(error, "Could not save your delivery option.")
  }
}

/** The manual provider. Cash on delivery is settled by the courier, not online. */
export const MANUAL_PAYMENT_PROVIDER = "pp_system_default"

/**
 * Creates the payment collection and its manual session.
 *
 * Safe to call more than once: Medusa returns the cart's existing collection
 * rather than making a second one — verified against the live API — so a
 * refresh on the review step cannot leave two collections behind.
 *
 * There is no card form and no provider choice. The only "payment method" is
 * handing cash to the rider, and the session exists so Medusa has something to
 * authorise when the cart completes.
 */
export async function ensurePaymentSession(
  cartId: string
): Promise<CheckoutResult> {
  try {
    const { payment_collection } = await sdk.client.fetch<{
      payment_collection: { id: string }
    }>("/store/payment-collections", {
      method: "POST",
      body: { cart_id: cartId },
    })

    await sdk.client.fetch(
      `/store/payment-collections/${payment_collection.id}/payment-sessions`,
      { method: "POST", body: { provider_id: MANUAL_PAYMENT_PROVIDER } }
    )

    return await readBack()
  } catch (error) {
    return fail(error, "Could not prepare your order for placement.")
  }
}
