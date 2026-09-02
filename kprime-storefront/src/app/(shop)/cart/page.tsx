import Link from "next/link"

import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Container } from "@/components/layout/Container"
import { CartLineItem } from "@/components/page/cart/CartLineItem"
import { CartLineItemMobile } from "@/components/page/cart/CartLineItemMobile"
import { EmptyCart } from "@/components/page/cart/EmptyCart"
import { CartSummary } from "@/components/shared/CartSummary"
import { Button } from "@/components/ui/Button"
import { findCartIssues, type CartIssue } from "@/lib/data/cart"
import { getCart } from "@/lib/data/cart"

/**
 * Cart.
 *
 * Dynamic, and it cannot be anything else: it reads the cart cookie, so there
 * is nothing to prerender and caching it would serve one shopper's cart to
 * everyone.
 *
 * TrustStrip is not rendered here — task 49 put it in `(shop)/layout.tsx`, so
 * it already sits below this content on every page. Adding it again would show
 * it twice.
 */
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Your cart",
}

/** Plain language, and always says what to do next. */
function describe(issue: CartIssue): string {
  switch (issue.kind) {
    case "unavailable":
      return `${issue.title} is no longer available. Remove it to continue.`
    case "out_of_stock":
      return `${issue.title} has gone out of stock. Remove it to continue.`
    case "insufficient_stock":
      return `Only ${issue.available} of ${issue.title} left. Reduce the quantity to continue.`
  }
}

export default async function CartPage() {
  const cart = await getCart()
  const items = cart?.items ?? []

  // Stock can change while items sit in a cart, so this is checked on render
  // rather than trusted from the moment they were added.
  const issues = cart ? await findCartIssues(cart) : []

  return (
    <Container className="py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />

      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Your cart</h1>

      {items.length === 0 || !cart ? (
        // Nothing else renders in this branch: no table headers over an empty
        // list, no summary totalling zero.
        <EmptyCart className="mt-8" />
      ) : (
        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          {issues.length > 0 && (
            // Above the lines, not beside them: this has to be read before
            // anyone reaches for checkout.
            <div
              role="alert"
              className="order-first w-full rounded-md border border-sale bg-paper p-4 lg:hidden"
            >
              <p className="font-medium text-sale">
                Some items need attention
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-brand">
                {issues.map((issue) => (
                  <li key={issue.lineId}>{describe(issue)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="min-w-0 flex-1">
            {issues.length > 0 && (
              <div
                role="alert"
                className="mb-4 hidden rounded-md border border-sale bg-paper p-4 lg:block"
              >
                <p className="font-medium text-sale">
                  Some items need attention
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-brand">
                  {issues.map((issue) => (
                    <li key={issue.lineId}>{describe(issue)}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* One layout per breakpoint rather than one component bending to
                both: the desktop row and the 360px card arrange the same
                controls differently enough that a single responsive markup
                would fight itself. Both share useCartLine. */}
            <div className="hidden lg:block">
              {items.map((line) => (
                <CartLineItem key={line.id} line={line} />
              ))}
            </div>

            <div className="lg:hidden">
              {items.map((line) => (
                <CartLineItemMobile key={line.id} line={line} />
              ))}
            </div>

            <Link
              href="/"
              className="mt-4 inline-block min-h-11 text-sm text-muted underline underline-offset-2 hover:text-brand"
            >
              Continue shopping
            </Link>
          </div>

          <CartSummary cart={cart} className="w-full lg:w-80 lg:shrink-0">
            {/* Checkout lands in Block L; it is also blocked while any line
                cannot be fulfilled, so the failure happens here with an
                explanation rather than at the payment step. */}
            <Button variant="primary" disabled className="w-full">
              Checkout
            </Button>
          </CartSummary>
        </div>
      )}
    </Container>
  )
}
