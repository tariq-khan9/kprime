import { redirect } from "next/navigation"

import {
  CHECKOUT_STEPS,
  CheckoutStepper,
  type CheckoutStepId,
} from "@/components/page/checkout/CheckoutStepper"
import { getCart } from "@/lib/data/cart"

/**
 * Checkout.
 *
 * Dynamic — it reads the cart cookie, so there is nothing to prerender.
 *
 * **The step lives in the URL** (`?step=address`), not in React state. That is
 * what makes the back button work mid-checkout (task 114) and what lets the
 * review step's edit links point at a specific step (task 111). It also means a
 * refresh lands where the shopper was rather than at the start.
 */
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Checkout",
}

function stepFrom(raw: string | string[] | undefined): CheckoutStepId {
  const value = Array.isArray(raw) ? raw[0] : raw

  return CHECKOUT_STEPS.some((step) => step.id === value)
    ? (value as CheckoutStepId)
    : "contact"
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const cart = await getCart()

  // Nothing to check out. Sending them to the cart shows the empty state and an
  // explanation, rather than an empty checkout that cannot be completed.
  if (!cart || cart.items.length === 0) {
    redirect("/cart")
  }

  const step = stepFrom((await searchParams).step)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <CheckoutStepper current={step} className="mb-8" />

      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="mt-2 text-muted">
        Step: {step}. The steps themselves land in tasks 105–111.
      </p>
    </div>
  )
}
