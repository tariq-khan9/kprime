"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useTransition } from "react"

import { PriceDisplay } from "@/components/shared/PriceDisplay"
import { QuantityStepper } from "@/components/shared/QuantityStepper"
import { useToast } from "@/components/ui/Toast"
import { announceCartCount } from "@/lib/cart/useCartCount"
import { removeLine, updateLineQuantity } from "@/lib/data/cart.actions"
import type { CartLine } from "@/lib/data/cart"
import { cn } from "@/lib/utils/format"

/**
 * Optimistic quantity and removal for one line, shared by both layouts.
 *
 * Exported so `CartLineItemMobile` reuses this exact behaviour rather than
 * reimplementing it — two copies of optimistic rollback would drift, and the
 * desktop and mobile carts would disagree about what a failure looks like.
 *
 * The rollback is explicit rather than `useOptimistic`: the previous value has
 * to survive an awaited action and be restored on a result the server returns
 * as `ok: false`, which is a rejected outcome, not a thrown one.
 */
export function useCartLine(line: CartLine) {
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [quantity, setQuantity] = useState(line.quantity)
  const [removed, setRemoved] = useState(false)

  const change = (next: number) => {
    const previous = quantity

    // Shown immediately; the server is the authority and corrects it below.
    setQuantity(next)

    startTransition(async () => {
      const result = await updateLineQuantity(line.id, next)

      if (result.ok) {
        announceCartCount(result.cart.itemCount)
      } else {
        setQuantity(previous)
        toast({
          title: "Could not update quantity",
          description: result.error,
          variant: "error",
        })
      }
    })
  }

  const remove = () => {
    setRemoved(true)

    startTransition(async () => {
      const result = await removeLine(line.id)

      if (result.ok) {
        announceCartCount(result.cart.itemCount)
      } else {
        setRemoved(false)
        toast({
          title: "Could not remove item",
          description: result.error,
          variant: "error",
        })
      }
    })
  }

  return { quantity, removed, pending, change, remove }
}

export function RemoveButton({
  onClick,
  disabled,
  className,
}: {
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-11 text-sm text-muted underline underline-offset-2",
        "hover:text-sale focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-brand disabled:opacity-50",
        className
      )}
    >
      Remove
    </button>
  )
}

export function LineThumbnail({ line }: { line: CartLine }) {
  return (
    <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-md border border-line bg-cream">
      {line.thumbnail ? (
        <Image
          src={line.thumbnail}
          alt=""
          fill
          sizes="80px"
          className="object-contain"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-2xl font-bold text-line">
          {line.title.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

/** Desktop row. `CartLineItemMobile` is the stacked version for 360px. */
export function CartLineItem({
  line,
  className,
}: {
  line: CartLine
  className?: string
}) {
  const { quantity, removed, pending, change, remove } = useCartLine(line)

  if (removed) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-start gap-4 border-b border-line py-4",
        pending && "opacity-60",
        className
      )}
    >
      <LineThumbnail line={line} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {line.productHandle ? (
          <Link
            href={`/products/${line.productHandle}`}
            className="font-medium text-brand hover:underline"
          >
            {line.title}
          </Link>
        ) : (
          <span className="font-medium text-brand">{line.title}</span>
        )}

        {line.variantTitle && (
          <span className="text-sm text-muted">{line.variantTitle}</span>
        )}

        <RemoveButton onClick={remove} disabled={pending} className="w-fit" />
      </div>

      <QuantityStepper
        value={quantity}
        onChange={change}
        disabled={pending}
        id={`qty-${line.id}`}
      />

      {/* Line total, not unit price: the row already states the quantity. */}
      <PriceDisplay
        price={line.unitPrice * quantity}
        size="line"
        className="w-28 shrink-0 text-right"
      />
    </div>
  )
}
