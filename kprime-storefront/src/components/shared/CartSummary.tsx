import type { Cart } from "@/lib/data/cart"
import { cn, formatPKR } from "@/lib/utils/format"

export type CartSummaryProps = {
  cart: Cart
  /**
   * Before an address exists there is no shipping figure, because the rate
   * depends on the city. Checkout passes false once one is chosen.
   */
  shippingKnown?: boolean
  children?: React.ReactNode
  className?: string
}

/**
 * Subtotal, shipping and total. Shared — checkout and the confirmation page
 * reuse it.
 *
 * **Every figure comes from the Medusa cart.** No arithmetic here: totals are
 * computed by the backend, including tax and any promotion, and recomputing
 * them in the browser is how a displayed total drifts from the charged one.
 *
 * Shipping reads "Calculated at checkout" rather than "Free" or "Rs 0" until an
 * address picks a zone. Showing zero and then adding a charge is the fastest
 * way to lose a COD order.
 */
export function CartSummary({
  cart,
  shippingKnown = false,
  children,
  className,
}: CartSummaryProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-line bg-cream p-4",
        className
      )}
    >
      <h2 className="font-bold text-brand">Order summary</h2>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">
            Subtotal
            <span className="ml-1">
              ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
            </span>
          </dt>
          <dd className="text-brand">{formatPKR(cart.subtotal)}</dd>
        </div>

        <div className="flex justify-between gap-4">
          <dt className="text-muted">Delivery</dt>
          <dd className={shippingKnown ? "text-brand" : "text-muted"}>
            {shippingKnown
              ? formatPKR(cart.shippingTotal)
              : "Calculated at checkout"}
          </dd>
        </div>

        <div className="mt-1 flex justify-between gap-4 border-t border-line pt-3">
          <dt className="font-bold text-brand">Total</dt>
          <dd className="font-bold text-brand">{formatPKR(cart.total)}</dd>
        </div>
      </dl>

      {/* The checkout CTA is passed in, so this component stays reusable on the
          confirmation page where there is nothing left to do. */}
      {children}
    </div>
  )
}
