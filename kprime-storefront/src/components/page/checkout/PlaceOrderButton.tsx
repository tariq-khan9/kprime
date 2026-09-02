"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import { Button } from "@/components/ui/Button"
import { announceCartCount } from "@/lib/cart/useCartCount"
import { placeOrderAction } from "@/lib/data/checkout.actions"

export type PlaceOrderButtonProps = {
  /** Blocks placement while something on the review step is unresolved. */
  disabled?: boolean
  total: string
}

/**
 * The last button in the flow.
 *
 * **Double-clicking places one order, not two.** Three things stop it: the
 * `placed` ref blocks a second click in the same tick before React re-renders,
 * `pending` blocks it afterwards, and Medusa returns the *same* order for an
 * already-completed cart rather than creating another. The last is the one that
 * also covers a lost connection and a retry.
 *
 * **A failure keeps the cart.** The cookie is only dropped once an order
 * exists, so an error leaves the shopper with everything they had and a
 * message, not an empty cart and no order.
 *
 * The copy stays soft (§2.2). We say "placed", never "confirmed" or
 * "dispatching" — a human still rings to verify, and that call must not
 * contradict what this page promised.
 */
export function PlaceOrderButton({
  disabled = false,
  total,
}: PlaceOrderButtonProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const placed = useRef(false)

  const onClick = () => {
    if (placed.current || pending || disabled) {
      return
    }

    placed.current = true
    setError(null)

    startTransition(async () => {
      const result = await placeOrderAction()

      if (result.ok) {
        // The cart is gone; the badge must not keep showing its old count.
        announceCartCount(0)
        router.push(`/order/confirmed/${result.orderId}`)
      } else {
        // Released, so the shopper can fix the problem and try again.
        placed.current = false
        setError(result.errors[0]?.message ?? "We could not place your order.")
      }
    })
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-sale">
          {error} Your cart has not been changed.
        </p>
      )}

      <Button
        variant="primary"
        onClick={onClick}
        disabled={disabled || pending}
        aria-busy={pending}
        className="w-full"
      >
        {pending ? "Placing your order…" : `Place order · ${total}`}
      </Button>

      <p className="text-center text-xs text-muted">
        You pay {total} in cash when the order arrives. We will call to confirm
        before dispatch.
      </p>
    </div>
  )
}
