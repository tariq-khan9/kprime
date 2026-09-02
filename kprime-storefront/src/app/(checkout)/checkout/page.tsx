import { redirect } from "next/navigation"

import { CheckoutStepper } from "@/components/page/checkout/CheckoutStepper"
import { ContactStep } from "@/components/page/checkout/ContactStep"
import { OrderReviewStep } from "@/components/page/checkout/OrderReviewStep"
import { OrderSummaryPanel } from "@/components/page/checkout/OrderSummaryPanel"
import { ShippingAddressStep } from "@/components/page/checkout/ShippingAddressStep"
import { ShippingMethodStep } from "@/components/page/checkout/ShippingMethodStep"
import { getCart, getCartId } from "@/lib/data/cart"
import { getCheckoutState, type CheckoutStepName } from "@/lib/data/checkout"
import { getProvinces, getShippingOptions } from "@/lib/data/shipping"

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

  // Fetched only for the steps that need them. Shipping options in particular
  // are uncached and depend on the saved address, so asking for them on every
  // step would be a wasted round trip.
  const needsOptions = step === "delivery" || step === "review"

  const [provinces, shippingOptions] = await Promise.all([
    step === "address" || step === "review" ? getProvinces() : [],
    needsOptions ? getShippingOptions(cartId) : [],
  ])

  const method =
    shippingOptions.find((option) => option.id === state.shippingOptionId) ??
    null

  const provinceName =
    provinces.find((entry) => entry.code === state.province)?.name ?? null

  // The total is only final once a method is chosen; before that the summary
  // says "calculated at checkout" rather than showing a total that will change.
  const shippingKnown = Boolean(state.shippingOptionId)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <CheckoutStepper current={step} className="mb-8" />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* Summary first in the DOM on mobile, where it is a collapsed bar
            above the form; the order flips at lg. */}
        <OrderSummaryPanel
          cart={cart}
          shippingKnown={shippingKnown}
          className="w-full lg:order-2 lg:w-80 lg:shrink-0"
        />

        <div className="min-w-0 flex-1 lg:order-1">
          {step === "contact" && <ContactStep state={state} />}

          {step === "address" && (
            <ShippingAddressStep state={state} provinces={provinces} />
          )}

          {step === "delivery" && (
            <ShippingMethodStep
              options={shippingOptions}
              city={state.city ?? ""}
              selected={state.shippingOptionId}
            />
          )}

          {step === "review" && (
            <>
              <OrderReviewStep
                state={state}
                method={method}
                provinceName={provinceName}
              />

              {/* PlaceOrderButton lands in task 112. */}
              <p className="mt-6 text-sm text-muted">
                Placing the order lands in task 112.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
