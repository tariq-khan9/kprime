"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import type { Cart } from "@/lib/data/cart"
import { formatPKR } from "@/lib/utils/format"

/** Fired by add-to-cart, carrying the cart the action just returned. */
const CART_OPEN = "kprime:cart-open"

/**
 * Opens the drawer with a freshly-updated cart.
 *
 * An event rather than a context: the drawer lives in the shop layout and the
 * button that opens it can be anywhere below, including inside the sticky bar.
 * Threading a provider through for one signal would touch far more files than
 * this does.
 */
export function openCartDrawer(cart: Cart): void {
  window.dispatchEvent(new CustomEvent(CART_OPEN, { detail: cart }))
}

/**
 * Right-hand cart drawer, opened by add-to-cart.
 *
 * A drawer rather than navigating to `/cart` (§4.6): sending someone off the
 * product page after they add something ends the browsing session, and the
 * whole point of a rail of related products is that they keep going.
 *
 * The cart comes from the action's response, so opening costs no extra request.
 *
 * Focus returns to the button that opened it — Radix restores focus to whatever
 * was focused when the dialog opened, which is the add-to-cart button that was
 * just clicked.
 */
export function CartDrawer() {
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<Cart | null>(null)

  useEffect(() => {
    const onOpen = (event: Event) => {
      setCart((event as CustomEvent<Cart>).detail)
      setOpen(true)
    }

    window.addEventListener(CART_OPEN, onOpen)

    return () => window.removeEventListener(CART_OPEN, onOpen)
  }, [])

  // Newest first, so the item just added is the one at the top rather than
  // buried under everything added earlier.
  const items = [...(cart?.items ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )

  return (
    <Drawer open={open} onOpenChange={setOpen} side="right" title="Your cart">
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="py-8 text-center text-muted">Your cart is empty.</p>
          ) : (
            items.map((line) => (
              <div
                key={line.id}
                className="flex items-start gap-3 border-b border-line py-3"
              >
                <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded border border-line bg-cream">
                  {line.thumbnail && (
                    <Image
                      src={line.thumbnail}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain"
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 break-words text-sm font-medium text-brand">
                    {line.title}
                  </span>
                  {line.variantTitle && (
                    <span className="text-xs text-muted">{line.variantTitle}</span>
                  )}
                  <span className="text-xs text-muted">
                    Qty {line.quantity}
                  </span>
                </div>

                <span className="shrink-0 text-sm font-medium text-brand">
                  {formatPKR(line.unitPrice * line.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {cart && items.length > 0 && (
          <div className="flex shrink-0 flex-col gap-3 border-t border-line pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-bold text-brand">
                {formatPKR(cart.subtotal)}
              </span>
            </div>

            {/* Delivery is deliberately absent, not shown as zero — the rate
                depends on a city that has not been given yet. */}
            <p className="text-xs text-muted">
              Delivery calculated at checkout.
            </p>

            <Button variant="secondary" asChild className="w-full">
              <Link href="/cart" onClick={() => setOpen(false)}>
                View cart
              </Link>
            </Button>

            <Button variant="primary" asChild className="w-full">
              <Link href="/checkout" onClick={() => setOpen(false)}>
                Checkout
              </Link>
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  )
}
