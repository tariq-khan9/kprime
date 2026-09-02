"use client"

import { useState, useTransition } from "react"

import { openCartDrawer } from "@/components/page/cart/CartDrawer"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/Toast"
import { announceCartCount } from "@/lib/cart/useCartCount"
import { addToCart } from "@/lib/data/cart.actions"

export type AddToCartButtonProps = {
  /** Null while a variant-defining option is still unchosen. */
  variantId: string | null
  quantity?: number
  outOfStock?: boolean
  className?: string
}

/**
 * The primary buy action.
 *
 * **Double-click adds one item, not two.** Two guards, because they fail
 * differently: `pending` blocks the second click once React has re-rendered,
 * and the `sending` ref blocks it in the same tick before that render lands.
 * Without the ref, two fast clicks both pass the pending check and Medusa
 * merges them into a line of two.
 *
 * On success it opens the cart drawer rather than navigating to `/cart`
 * (§4.6) — sending someone off the product page ends the browsing session,
 * and the related-products rail below exists precisely so they keep going.
 */
export function AddToCartButton({
  variantId,
  quantity = 1,
  outOfStock = false,
  className,
}: AddToCartButtonProps) {
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [sending, setSending] = useState(false)

  const disabled = !variantId || outOfStock || pending || sending

  const onClick = () => {
    if (disabled || !variantId) {
      return
    }

    setSending(true)

    startTransition(async () => {
      const result = await addToCart(variantId, quantity)

      if (result.ok) {
        // From the response, not a second request — the action already knows.
        announceCartCount(result.cart.itemCount)

        toast({
          title: "Added to cart",
          description: `${result.cart.itemCount} item${
            result.cart.itemCount === 1 ? "" : "s"
          } in your cart`,
          variant: "success",
        })

        // The action already returned the updated cart, so the drawer opens
        // with no further request.
        openCartDrawer(result.cart)
      } else {
        toast({
          title: "Could not add to cart",
          description: result.error,
          variant: "error",
        })
      }

      setSending(false)
    })
  }

  const label = outOfStock
    ? "Out of stock"
    : !variantId
      ? "Select an option"
      : pending || sending
        ? "Adding…"
        : "Add to cart"

  return (
    <Button
      variant="primary"
      onClick={onClick}
      disabled={disabled}
      // Announced rather than only spun: the label already changes to "Adding…",
      // and aria-busy tells a screen reader the control is working.
      aria-busy={pending || sending}
      className={className}
    >
      {label}
    </Button>
  )
}
