import Link from "next/link"
import { redirect } from "next/navigation"

import { CheckoutStepper } from "@/components/page/checkout/CheckoutStepper"
import { ContactStep } from "@/components/page/checkout/ContactStep"
import { OrderReviewStep } from "@/components/page/checkout/OrderReviewStep"
import { OrderSummaryPanel } from "@/components/page/checkout/OrderSummaryPanel"
import { PlaceOrderButton } from "@/components/page/checkout/PlaceOrderButton"
import { ShippingAddressStep } from "@/components/page/checkout/ShippingAddressStep"
import { ShippingMethodStep } from "@/components/page/checkout/ShippingMethodStep"
import { findCartIssues, getCart, getCartId } from "@/lib/data/cart"
import { getCheckoutState, type CheckoutStepName } from "@/lib/data/checkout"
import { getProvinces, getShippingOptions } from "@/lib/data/shipping"
import { formatPKR } from "@/lib/utils/format"

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
 *
 * Hardening (task 114). Five things can go wrong between opening checkout and
 * placing, and each is handled where it happens rather than by a guard rail
 * around the whole flow:
 *
 * - **Back button and refresh** work because the step is a URL parameter and
 *   every value is read back off the cart, not held in React state. There is no
 *   in-memory progress to lose.
 * - **An expired cart** — cookie pointing at a cart the backend no longer has —
 *   resolves to null and redirects to `/cart`, which explains the empty state.
 *   It never renders a checkout that cannot complete.
 * - **Stock changing underneath** is re-checked here, on every render, against
 *   live inventory. A cart that was fine at `/cart` can go stale while someone
 *   fills in an address.
 * - **A failure during completion** keeps the cart: the cookie is dropped only
 *   after an order exists.
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

  // Re-checked here, not trusted from the cart page. Someone can spend several
  // minutes on these forms, and the last unit of something can sell in that
  // time. Placement would fail anyway — better to say so before they commit.
  const issues = await findCartIssues(cart)

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

          {issues.length > 0 && (
            <div
              role="alert"
              className="mb-6 rounded-md border border-sale bg-paper p-4"
            >
              <p className="font-medium text-sale">
                Something in your cart changed
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-brand">
                {issues.map((issue) => (
                  <li key={issue.lineId}>
                    {issue.kind === "insufficient_stock"
                      ? `Only ${issue.available} of ${issue.title} left.`
                      : issue.kind === "out_of_stock"
                        ? `${issue.title} has gone out of stock.`
                        : `${issue.title} is no longer available.`}
                  </li>
                ))}
              </ul>
              <Link
                href="/cart"
                className="mt-3 inline-block min-h-11 text-sm underline underline-offset-2"
              >
                Go back to your cart to fix this
              </Link>
            </div>
          )}

          {step === "review" && (
            <>
              <OrderReviewStep
                state={state}
                method={method}
                provinceName={provinceName}
              />

              {/* Blocked if the chosen delivery option disappeared between
                  choosing it and arriving here — the review step says so, and
                  placing would fail anyway. */}
              <PlaceOrderButton
                disabled={!method || issues.length > 0}
                total={formatPKR(cart.total)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
