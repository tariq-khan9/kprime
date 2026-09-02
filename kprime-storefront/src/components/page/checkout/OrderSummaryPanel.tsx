"use client"

import Image from "next/image"
import { useState } from "react"

import { CartSummary } from "@/components/shared/CartSummary"
import type { Cart, CartLine } from "@/lib/data/cart"
import { cn, formatPKR } from "@/lib/utils/format"

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={cn(
        "size-5 shrink-0 text-muted transition-transform duration-200",
        open && "rotate-180"
      )}
    >
      <path
        d="M6 8l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The line list. Task 115 replaces this with the shared `OrderItemsList`, which
 * the confirmation page also uses; until then it is deliberately a plain list
 * rather than a second component nobody asked for.
 */
function Items({ items }: { items: CartLine[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((line) => (
        <li key={line.id} className="flex items-start gap-3">
          <div className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded border border-line bg-cream">
            {line.thumbnail && (
              <Image
                src={line.thumbnail}
                alt=""
                fill
                sizes="48px"
                className="object-contain"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="line-clamp-2 break-words text-sm text-brand">
              {line.title}
            </span>
            {line.variantTitle && (
              <span className="text-xs text-muted">{line.variantTitle}</span>
            )}
            <span className="text-xs text-muted">Qty {line.quantity}</span>
          </div>

          <span className="shrink-0 text-sm text-brand">
            {formatPKR(line.unitPrice * line.quantity)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export type OrderSummaryPanelProps = {
  cart: Cart
  /** True once a shipping method is chosen, so the total is final. */
  shippingKnown?: boolean
  className?: string
}

/**
 * What is being bought, beside the form.
 *
 * **Collapsed at 360px, expanded on desktop.** On a phone the summary sits
 * above the form, and an expanded list of five products would push the first
 * input off the screen — someone who opened checkout wants to fill it in, not
 * re-read their basket. The total stays visible in the collapsed header, since
 * that is the number they actually want.
 *
 * Sticky on desktop, where there is room for it to follow the form down.
 *
 * Totals come from the Medusa cart through `CartSummary`, so the figure here
 * and the figure charged cannot drift apart.
 */
export function OrderSummaryPanel({
  cart,
  shippingKnown = false,
  className,
}: OrderSummaryPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn("lg:sticky lg:top-6", className)}>
      {/* Mobile: a disclosure, closed by default. */}
      <div className="rounded-md border border-line bg-cream lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="order-summary-mobile"
          className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="font-medium text-brand">
            {open ? "Hide" : "Show"} order summary
            <span className="ml-2 text-muted">
              ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
            </span>
          </span>

          <span className="flex items-center gap-2">
            <span className="font-bold text-brand">
              {formatPKR(cart.total)}
            </span>
            <Chevron open={open} />
          </span>
        </button>

        <div id="order-summary-mobile" hidden={!open} className="px-4 pb-4">
          <Items items={cart.items} />
          <CartSummary
            cart={cart}
            shippingKnown={shippingKnown}
            className="mt-4 border-0 bg-transparent p-0"
          />
        </div>
      </div>

      {/* Desktop: always open. */}
      <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:rounded-md lg:border lg:border-line lg:bg-cream lg:p-4">
        <h2 className="font-bold text-brand">Your order</h2>
        <Items items={cart.items} />
        <CartSummary
          cart={cart}
          shippingKnown={shippingKnown}
          className="border-0 bg-transparent p-0"
        />
      </div>
    </div>
  )
}
