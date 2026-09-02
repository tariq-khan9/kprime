"use client"

import { useEffect, useState } from "react"

import { readCartCount } from "@/lib/data/cart.actions"

/** Fired whenever an action changes the cart, carrying the new item count. */
export const CART_CHANGED = "kprime:cart-changed"

/** Tells every mounted badge what the count is now. */
export function announceCartCount(count: number): void {
  window.dispatchEvent(new CustomEvent(CART_CHANGED, { detail: count }))
}

/**
 * Item count for the header badge.
 *
 * Read on the client, not in the layout. A server layout reading the cart
 * cookie would opt every page into dynamic rendering and cost the static
 * generation on the home page and all fifteen product pages — a badge is not
 * worth that.
 *
 * Seeded once on mount, then updated from an event rather than re-fetched:
 * add-to-cart already knows the new count from the action's response, so asking
 * the server again would be a second round trip to learn something we hold.
 */
export function useCartCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let live = true

    readCartCount()
      .then((value) => {
        if (live) {
          setCount(value)
        }
      })
      // A failed read leaves the badge at zero. An empty badge is a smaller lie
      // than a wrong number, and the cart page itself is still reachable.
      .catch(() => {})

    const onChange = (event: Event) => {
      setCount((event as CustomEvent<number>).detail)
    }

    window.addEventListener(CART_CHANGED, onChange)

    return () => {
      live = false
      window.removeEventListener(CART_CHANGED, onChange)
    }
  }, [])

  return count
}
