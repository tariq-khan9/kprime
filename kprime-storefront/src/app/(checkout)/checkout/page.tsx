import { redirect } from "next/navigation"

import { CheckoutStepper } from "@/components/page/checkout/CheckoutStepper"
import { ContactStep } from "@/components/page/checkout/ContactStep"
import { ShippingAddressStep } from "@/components/page/checkout/ShippingAddressStep"
import { getCart, getCartId } from "@/lib/data/cart"
import { getCheckoutState, type CheckoutStepName } from "@/lib/data/checkout"
import { getProvinces } from "@/lib/data/shipping"

/**
 * Checkout.
 *
 * Dynamic — it reads the cart cookie, so there is nothing to prerender.
 *
 * **The step lives in the URL** (`?step=address`), not in React state. That is
 * what makes the back button work mid-checkout (task 114), what lets the review
 * step's edit links point at a specific step (task 111), and what makes a
 * refresh land where the shopper was rather than at the start.
 *
 * The requested step is **clamped to what the cart can support**. Typing
 * `?step=review` with an empty address does not skip the address — it lands on
 * the address step. Otherwise the URL would be a way to reach placement without
 * the details placement needs.
 */
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Checkout",
}

const ORDER: CheckoutStepName[] = ["contact", "address", "delivery", "review"]

function requestedStep(raw: string | string[] | undefined): CheckoutStepName {
  const value = Array.isArray(raw) ? raw[0] : raw

  return ORDER.includes(value as CheckoutStepName)
    ? (value as CheckoutStepName)
    : "contact"
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [cart, cartId] = await Promise.all([getCart(), getCartId()])

  // Nothing to check out. The cart page explains why, rather than showing an
  // empty checkout that cannot be completed.
  if (!cart || cart.items.length === 0 || !cartId) {
    redirect("/cart")
  }

  const state = await getCheckoutState(cartId)

  if (!state) {
    redirect("/cart")
  }

  const wanted = requestedStep((await searchParams).step)

  // Never further than the cart supports.
  const step =
    ORDER.indexOf(wanted) > ORDER.indexOf(state.furthestStep)
      ? state.furthestStep
      : wanted

  const provinces = step === "address" ? await getProvinces() : []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <CheckoutStepper current={step} className="mb-8" />

      {step === "contact" && <ContactStep state={state} />}

      {step === "address" && (
        <ShippingAddressStep state={state} provinces={provinces} />
      )}

      {(step === "delivery" || step === "review") && (
        <p className="text-muted">
          The {step} step lands in tasks 108–111.
        </p>
      )}
    </div>
  )
}
